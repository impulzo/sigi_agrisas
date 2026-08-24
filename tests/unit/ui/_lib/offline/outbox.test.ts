/**
 * @jest-environment jsdom
 */
import "fake-indexeddb/auto";
import { resetOfflineDbForTests } from "../../../../../app/_lib/offline/db";
import {
  enqueueSale,
  enqueueQuote,
  listOutboxSales,
  listOutboxQuotes,
  markSyncing,
  markSynced,
  markTransientFailure,
  markBusinessFailure,
  retryOutboxItem,
  discardOutboxItem,
  updateOutboxPayload,
  countPending,
  makeProvisionalCode,
} from "../../../../../app/_lib/offline/outbox";

async function resetDb() {
  await resetOfflineDbForTests();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase("agrisas-offline");
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  await resetDb();
});

describe("outbox — enqueue", () => {
  it("enqueueSale genera clientRequestId y provisionalCode, guarda con status pending", async () => {
    const record = await enqueueSale({ ownerBranchId: "b1", payload: { branchId: "b1" }, localTotal: 150 });
    expect(record.clientRequestId).toBeTruthy();
    expect(record.provisionalCode).toBe(makeProvisionalCode(record.clientRequestId));
    expect(record.status).toBe("pending");
    expect(record.ownerBranchId).toBe("b1");
    expect(record.payload.clientRequestId).toBe(record.clientRequestId);
  });

  it("enqueueQuote análogo a enqueueSale", async () => {
    const record = await enqueueQuote({ ownerBranchId: "b1", payload: { branchId: "b1" }, localTotal: 50 });
    expect(record.status).toBe("pending");
    expect(record.clientRequestId).toBeTruthy();
  });

  it("dos enqueue generan clientRequestId distintos", async () => {
    const a = await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 1 });
    const b = await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 1 });
    expect(a.clientRequestId).not.toBe(b.clientRequestId);
  });
});

describe("outbox — listado por sucursal, orden FIFO", () => {
  it("lista solo los ítems de la sucursal dada, ordenados por createdAt", async () => {
    await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 1 });
    await enqueueSale({ ownerBranchId: "b2", payload: {}, localTotal: 1 });
    await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 1 });

    const b1 = await listOutboxSales("b1");
    const b2 = await listOutboxSales("b2");
    expect(b1).toHaveLength(2);
    expect(b2).toHaveLength(1);
    expect(b1[0].createdAt).toBeLessThanOrEqual(b1[1].createdAt);
  });
});

describe("outbox — transiciones de estado", () => {
  it("markSyncing → markSynced guarda serverId/serverFolioCode", async () => {
    const record = await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 100 });
    await markSyncing("outboxSales", record.clientRequestId);
    let [item] = await listOutboxSales("b1");
    expect(item.status).toBe("syncing");

    await markSynced("outboxSales", record.clientRequestId, "server-id-1", "TK-1");
    [item] = await listOutboxSales("b1");
    expect(item.status).toBe("synced");
    expect(item.serverId).toBe("server-id-1");
    expect(item.serverFolioCode).toBe("TK-1");
  });

  it("markTransientFailure incrementa attempts y agenda nextRetryAt, sin marcar failed", async () => {
    const record = await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 100 });
    const nextRetryAt = Date.now() + 5000;
    await markTransientFailure("outboxSales", record.clientRequestId, 1, nextRetryAt, {
      code: "network_error",
      message: "Sin conexión",
    });
    const [item] = await listOutboxSales("b1");
    expect(item.status).toBe("pending");
    expect(item.attempts).toBe(1);
    expect(item.nextRetryAt).toBe(nextRetryAt);
    expect(item.lastError?.code).toBe("network_error");
  });

  it("markBusinessFailure marca failed sin reintento automático", async () => {
    const record = await enqueueQuote({ ownerBranchId: "b1", payload: {}, localTotal: 100 });
    await markBusinessFailure("outboxQuotes", record.clientRequestId, {
      code: "http_400",
      message: "expiresAt must be in the future",
    });
    const [item] = await listOutboxQuotes("b1");
    expect(item.status).toBe("failed");
    expect(item.nextRetryAt).toBeNull();
    expect(item.lastError?.message).toContain("expiresAt");
  });

  it("retryOutboxItem regresa un ítem failed a pending, inmediatamente retriable", async () => {
    const record = await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 100 });
    await markBusinessFailure("outboxSales", record.clientRequestId, { code: "http_400", message: "x" });
    await retryOutboxItem("outboxSales", record.clientRequestId);
    const [item] = await listOutboxSales("b1");
    expect(item.status).toBe("pending");
    expect(item.nextRetryAt).toBeNull();
    expect(item.lastError).toBeNull();
  });

  it("discardOutboxItem elimina el registro", async () => {
    const record = await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 100 });
    await discardOutboxItem("outboxSales", record.clientRequestId);
    const items = await listOutboxSales("b1");
    expect(items).toHaveLength(0);
  });

  it("updateOutboxPayload reemplaza el payload y regresa el ítem a pending", async () => {
    const record = await enqueueQuote({ ownerBranchId: "b1", payload: { expiresAt: "2020-01-01" }, localTotal: 100 });
    await markBusinessFailure("outboxQuotes", record.clientRequestId, { code: "http_400", message: "expired" });
    await updateOutboxPayload("outboxQuotes", record.clientRequestId, { expiresAt: "2099-01-01" });
    const [item] = await listOutboxQuotes("b1");
    expect(item.status).toBe("pending");
    expect(item.payload.expiresAt).toBe("2099-01-01");
    expect(item.payload.clientRequestId).toBe(record.clientRequestId);
  });
});

describe("outbox — countPending", () => {
  it("cuenta ventas y cotizaciones no sincronizadas de la sucursal", async () => {
    const s1 = await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 1 });
    await enqueueSale({ ownerBranchId: "b1", payload: {}, localTotal: 1 });
    await enqueueQuote({ ownerBranchId: "b1", payload: {}, localTotal: 1 });
    await markSynced("outboxSales", s1.clientRequestId, "sid", "F-1");

    expect(await countPending("b1")).toBe(2); // 1 venta pendiente + 1 cotización pendiente
  });
});
