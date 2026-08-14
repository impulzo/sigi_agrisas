import { searchProductsByName } from "../../../../../../../app/(private)/purchases/_logic/services/searchProductsByName";
import { ForbiddenError, NetworkError } from "../../../../../../../app/_lib/authFetch";

function mockFetch(status: number, body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe("searchProductsByName", () => {
  it("llama al endpoint con ?search=<nombre> y mapea unit en cada item", async () => {
    const fetch = mockFetch(200, {
      items: [
        { id: "prod1", code: "AMK", name: "AMINOGREEN K 1LT", unit: "LTR", ivaRate: 0.16, iepsRate: null, isActive: true },
      ],
      total: 1,
    });

    const items = await searchProductsByName("AMINOGREEN K", fetch as never);

    expect(fetch).toHaveBeenCalledTimes(1);
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("/api/v1/admin/products?");
    expect(calledUrl).toContain("search=AMINOGREEN");
    expect(calledUrl).toContain("pageSize=100");
    expect(calledUrl).toContain("includeInactive=false");

    expect(items).toEqual([
      { id: "prod1", code: "AMK", name: "AMINOGREEN K 1LT", unit: "LTR", ivaRate: 0.16, iepsRate: null, isActive: true },
    ]);
  });

  it("devuelve lista vacía cuando no hay candidatos", async () => {
    const fetch = mockFetch(200, { items: [], total: 0 });
    const items = await searchProductsByName("NO EXISTE", fetch as never);
    expect(items).toEqual([]);
  });

  it("lanza ForbiddenError en 403 con el permiso requerido", async () => {
    const fetch = mockFetch(403, { error: { required: "products:read" } });
    await expect(searchProductsByName("X", fetch as never)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("lanza NetworkError en respuesta no-ok distinta de 403", async () => {
    const fetch = mockFetch(500, {});
    await expect(searchProductsByName("X", fetch as never)).rejects.toBeInstanceOf(NetworkError);
  });
});
