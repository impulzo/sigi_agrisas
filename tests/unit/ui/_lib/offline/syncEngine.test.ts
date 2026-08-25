/**
 * @jest-environment jsdom
 */
import "fake-indexeddb/auto";
import { resetOfflineDbForTests } from "../../../../../app/_lib/offline/db";
import { resetConnectivityForTests } from "../../../../../app/_lib/offline/connectivity";
import { resetSyncEngineForTests } from "../../../../../app/_lib/offline/syncEngine";

jest.mock("../../../../../app/_lib/authFetch", () => {
  const actual = jest.requireActual("../../../../../app/_lib/authFetch");
  return { ...actual, authFetch: jest.fn() };
});

import { authFetch, NetworkError } from "../../../../../app/_lib/authFetch";
import { runSyncPass } from "../../../../../app/_lib/offline/syncEngine";
import { enqueueSale, enqueueQuote, listOutboxSales, listOutboxQuotes, markBusinessFailure } from "../../../../../app/_lib/offline/outbox";

const mockAuthFetch = authFetch as jest.MockedFunction<typeof authFetch>;

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as unknown as Response;
}

async function resetAll() {
  await resetOfflineDbForTests();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase("agrisas-offline");
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
  resetConnectivityForTests(true);
  resetSyncEngineForTests();
  mockAuthFetch.mockReset();
}

beforeEach(async () => {
  await resetAll();
});

describe("syncEngine — drenado exitoso", () => {
  it("sincroniza una venta pendiente: status synced, serverId y folio guardados", async () => {
    const record = await enqueueSale({ ownerBranchId: "b1", payload: { branchId: "b1" }, localTotal: 100 });
    mockAuthFetch.mockResolvedValue(jsonResponse(201, { id: "server-sale-1", folioNumber: 42, folioPrefix: "TK" }));

    await runSyncPass("b1");

    const [item] = await listOutboxSales("b1");
    expect(item.clientRequestId).toBe(record.clientRequestId);
    expect(item.status).toBe("synced");
    expect(item.serverId).toBe("server-sale-1");
    expect(item.serverFolioCode).toBe("TK-42");
  });

  it("envía el payload (con clientRequestId) tal cual al endpoint de sales", async () => {
    await enqueueSale({ ownerBranchId: "b1", payload: { branchId: "b1", items: [] }, localTotal: 100 });
    mockAuthFetch.mockResolvedValue(jsonResponse(201, { id: "s1", folioNumber: 1 }));

    await runSyncPass("b1");

    expect(mockAuthFetch).toHaveBeenCalledWith(
      "/api/v1/admin/sales",
      expect.objectContaining({ method: "POST" })
    );
    const callBody = JSON.parse((mockAuthFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.branchId).toBe("b1");
    expect(callBody.clientRequestId).toBeTruthy();
  });

  it("sincroniza cotizaciones contra /api/v1/admin/quotes", async () => {
    await enqueueQuote({ ownerBranchId: "b1", payload: { branchId: "b1" }, localTotal: 50 });
    mockAuthFetch.mockResolvedValue(jsonResponse(201, { id: "quote-1", folioNumber: 7, folioPrefix: "COT" }));

    await runSyncPass("b1");

    const [item] = await listOutboxQuotes("b1");
    expect(item.status).toBe("synced");
    expect(item.serverFolioCode).toBe("COT-7");
    expect(mockAuthFetch).toHaveBeenCalledWith("/api/v1/admin/quotes", expect.anything());
  });
});

describe("syncEngine — falla transitoria (5xx) no bloquea el resto de la cola", () => {
  it("un 500 en el primer ítem no impide sincronizar el segundo ítem independiente", async () => {
    await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 100 });
    await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 100 });

    mockAuthFetch
      .mockResolvedValueOnce(jsonResponse(500, { error: "Internal Server Error" }))
      .mockResolvedValueOnce(jsonResponse(201, { id: "s2", folioNumber: 2 }));

    await runSyncPass("b1");

    const items = await listOutboxSales("b1");
    const failed = items.find((i) => i.status === "pending");
    const synced = items.find((i) => i.status === "synced");
    expect(failed?.attempts).toBe(1);
    expect(failed?.nextRetryAt).not.toBeNull();
    expect(synced).toBeDefined();
  });
});

describe("syncEngine — NetworkError detiene el resto del pase (sin desperdiciar requests offline)", () => {
  it("un NetworkError en el primer ítem impide intentar el segundo en el mismo pase", async () => {
    await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 100 });
    await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 100 });

    mockAuthFetch.mockRejectedValue(new NetworkError());

    await runSyncPass("b1");

    expect(mockAuthFetch).toHaveBeenCalledTimes(1);
    const items = await listOutboxSales("b1");
    expect(items.every((i) => i.status === "pending")).toBe(true);
  });
});

describe("syncEngine — falla de negocio (4xx) no se reintenta automáticamente", () => {
  it("un 400 marca failed y no bloquea items subsecuentes", async () => {
    await enqueueQuote({ ownerBranchId: "b1", payload: {}, localTotal: 100 });
    await enqueueQuote({ ownerBranchId: "b1", payload: {}, localTotal: 100 });

    mockAuthFetch
      .mockResolvedValueOnce(jsonResponse(400, { error: "expiresAt must be in the future" }))
      .mockResolvedValueOnce(jsonResponse(201, { id: "q2", folioNumber: 9 }));

    await runSyncPass("b1");

    const items = await listOutboxQuotes("b1");
    const failed = items.find((i) => i.status === "failed");
    const synced = items.find((i) => i.status === "synced");
    expect(failed?.lastError?.message).toContain("expiresAt");
    expect(synced).toBeDefined();
  });
});

describe("syncEngine — isRetriable", () => {
  it("no reintenta un ítem con status failed (falla de negocio) sin acción manual", async () => {
    const record = await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 100 });
    await markBusinessFailure("outboxSales", record.clientRequestId, { code: "http_400", message: "x" });

    mockAuthFetch.mockResolvedValue(jsonResponse(201, { id: "s1", folioNumber: 1 }));
    await runSyncPass("b1");

    expect(mockAuthFetch).not.toHaveBeenCalled();
    const [item] = await listOutboxSales("b1");
    expect(item.status).toBe("failed");
  });

  it("no reintenta antes de nextRetryAt (backoff en curso)", async () => {
    await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 100 });
    mockAuthFetch.mockRejectedValueOnce(new NetworkError());
    await runSyncPass("b1"); // primera pasada: falla, agenda backoff futuro

    resetSyncEngineForTests(); // libera el flag `syncing` sin tocar el outbox
    mockAuthFetch.mockClear();
    mockAuthFetch.mockResolvedValue(jsonResponse(201, { id: "s1", folioNumber: 1 }));

    await runSyncPass("b1"); // segunda pasada inmediata: backoff aún no vence
    expect(mockAuthFetch).not.toHaveBeenCalled();
  });

  it("nunca reintenta un ítem ya synced", async () => {
    const record = await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 100 });
    mockAuthFetch.mockResolvedValue(jsonResponse(201, { id: "s1", folioNumber: 1 }));
    await runSyncPass("b1");
    expect(mockAuthFetch).toHaveBeenCalledTimes(1);

    resetSyncEngineForTests();
    mockAuthFetch.mockClear();
    await runSyncPass("b1");
    expect(mockAuthFetch).not.toHaveBeenCalled();
  });
});

describe("syncEngine — no-op cuando offline", () => {
  it("no llama authFetch si isOnline()===false", async () => {
    await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 100 });
    resetConnectivityForTests(false);

    await runSyncPass("b1");

    expect(mockAuthFetch).not.toHaveBeenCalled();
  });
});
