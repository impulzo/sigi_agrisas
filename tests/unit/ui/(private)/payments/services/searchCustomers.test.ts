import { searchCustomers } from "../../../../../../app/(private)/payments/_logic/services/searchCustomers";
import { NetworkError } from "../../../../../../app/_lib/authFetch";

function mockFetch(status: number, body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function makeCustomerBody(overrides: Record<string, unknown> = {}) {
  return { id: "cust-1", code: "CUST001", name: "Cliente de prueba", rfc: "XAXX010101000", ...overrides };
}

describe("searchCustomers (payments)", () => {
  it("devuelve la lista de clientes en éxito 200", async () => {
    const body = { items: [makeCustomerBody()], total: 1 };
    const fetch = mockFetch(200, body);
    const result = await searchCustomers({}, fetch as never);
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("cust-1");
    expect(result.items[0].name).toBe("Cliente de prueba");
  });

  it("mapea respuesta no-ok a NetworkError", async () => {
    const fetch = mockFetch(500, { error: "Internal Server Error" });
    await expect(searchCustomers({}, fetch as never)).rejects.toBeInstanceOf(NetworkError);
  });

  it("lanza NetworkError en fallo de red", async () => {
    const fetch = jest.fn().mockRejectedValue(new Error("network failure"));
    await expect(searchCustomers({}, fetch as never)).rejects.toBeInstanceOf(NetworkError);
  });

  it("relanza AbortError sin envolver en NetworkError", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const fetch = jest.fn().mockRejectedValue(abortError);
    await expect(searchCustomers({}, fetch as never)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("incluye search en la URL solo con 2+ caracteres", async () => {
    const body = { items: [], total: 0 };
    const fetchShort = mockFetch(200, body);
    await searchCustomers({ search: "a" }, fetchShort as never);
    expect((fetchShort as jest.Mock).mock.calls[0][0] as string).not.toContain("search=");

    const fetchLong = mockFetch(200, body);
    await searchCustomers({ search: "ac" }, fetchLong as never);
    expect((fetchLong as jest.Mock).mock.calls[0][0] as string).toContain("search=ac");
  });

  it("siempre incluye includeInactive=false en la URL", async () => {
    const fetch = mockFetch(200, { items: [], total: 0 });
    await searchCustomers({}, fetch as never);
    expect((fetch as jest.Mock).mock.calls[0][0] as string).toContain("includeInactive=false");
  });
});
