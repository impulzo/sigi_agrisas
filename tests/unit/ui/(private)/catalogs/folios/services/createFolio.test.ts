import { createFolio } from "../../../../../../../app/(private)/catalogs/folios/_logic/services/createFolio";
import { NetworkError } from "../../../../../../../app/_lib/authFetch";
import { FolioCodeAlreadyInUseError } from "../../../../../../../app/(private)/catalogs/folios/_logic/errors";

const baseDto = {
  id: "1",
  code: "FAC",
  name: "Factura",
  prefix: "FAC-",
  currentNumber: 1,
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("createFolio", () => {
  it("returns Folio on 201 success", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => baseDto,
    } as Response);

    const result = await createFolio({ body: { code: "FAC", name: "Factura" } }, mockFetch);

    expect(result.id).toBe("1");
    expect(result.code).toBe("FAC");
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("throws FolioCodeAlreadyInUseError on 409", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "Folio code already in use" }),
    } as Response);

    await expect(
      createFolio({ body: { code: "FAC", name: "Factura" } }, mockFetch)
    ).rejects.toBeInstanceOf(FolioCodeAlreadyInUseError);
  });

  it("throws NetworkError on 400", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Bad request" }),
    } as Response);

    await expect(
      createFolio({ body: { code: "FAC", name: "Factura" } }, mockFetch)
    ).rejects.toBeInstanceOf(NetworkError);
  });
});
