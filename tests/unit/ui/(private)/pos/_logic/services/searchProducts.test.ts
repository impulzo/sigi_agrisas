import { searchProducts } from "../../../../../../../app/(private)/pos/_logic/services/searchProducts";
import { SaleScopingForbiddenError } from "../../../../../../../app/(private)/pos/_logic/errors";
import { NetworkError } from "../../../../../../../app/_lib/authFetch";

const NOW = "2026-05-30T10:00:00.000Z";

function mockFetch(status: number, body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function makeProductBody(overrides: Record<string, unknown> = {}) {
  return {
    id: "prod-1",
    code: "PROD001",
    name: "Producto de prueba",
    ivaRate: 0.16,
    iepsRate: null,
    isActive: true,
    departmentId: "dept-1",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("searchProducts", () => {
  it("devuelve la lista de productos mapeada en éxito 200", async () => {
    const body = { items: [makeProductBody()], total: 1, page: 1, pageSize: 20 };
    const fetch = mockFetch(200, body);
    const result = await searchProducts({}, fetch as never);
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("prod-1");
    expect(result.items[0].code).toBe("PROD001");
    expect(result.items[0].ivaRate).toBe(0.16);
    expect(result.items[0].iepsRate).toBeNull();
    expect(result.items[0].createdAt).toBeInstanceOf(Date);
    expect(result.items[0].updatedAt).toBeInstanceOf(Date);
  });

  it("mapea 403 a SaleScopingForbiddenError", async () => {
    const fetch = mockFetch(403, { error: "Forbidden" });
    await expect(searchProducts({}, fetch as never)).rejects.toBeInstanceOf(SaleScopingForbiddenError);
  });

  it("mapea respuesta no-ok (500) a NetworkError", async () => {
    const fetch = mockFetch(500, { error: "Internal Server Error" });
    await expect(searchProducts({}, fetch as never)).rejects.toBeInstanceOf(NetworkError);
  });

  it("lanza NetworkError en fallo de red", async () => {
    const fetch = jest.fn().mockRejectedValue(new Error("network failure"));
    await expect(searchProducts({}, fetch as never)).rejects.toBeInstanceOf(NetworkError);
  });

  it("relanza AbortError sin envolver en NetworkError", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const fetch = jest.fn().mockRejectedValue(abortError);
    await expect(searchProducts({}, fetch as never)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("incluye el parámetro search en la URL cuando se pasa", async () => {
    const body = { items: [], total: 0, page: 1, pageSize: 20 };
    const fetch = mockFetch(200, body);
    await searchProducts({ search: "maíz" }, fetch as never);
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("search=ma%C3%ADz");
  });

  it("no incluye search en la URL cuando es cadena vacía", async () => {
    const body = { items: [], total: 0, page: 1, pageSize: 20 };
    const fetch = mockFetch(200, body);
    await searchProducts({ search: "   " }, fetch as never);
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("search=");
  });

  it("incluye branchId en la URL cuando se pasa", async () => {
    const body = { items: [], total: 0, page: 1, pageSize: 20 };
    const fetch = mockFetch(200, body);
    await searchProducts({ branchId: "branch-42" }, fetch as never);
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("branchId=branch-42");
  });

  it("siempre incluye includeInactive=false en la URL", async () => {
    const body = { items: [], total: 0, page: 1, pageSize: 20 };
    const fetch = mockFetch(200, body);
    await searchProducts({}, fetch as never);
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("includeInactive=false");
  });
});
