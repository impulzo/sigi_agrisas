import { updateFolio } from "../../../../../../../app/(private)/catalogs/folios/_logic/services/updateFolio";
import {
  FolioNotFoundError,
  FolioCodeAlreadyInUseError,
} from "../../../../../../../app/(private)/catalogs/folios/_logic/errors";

const baseDto = {
  id: "1",
  code: "FAC",
  name: "Factura actualizada",
  prefix: "FAC-",
  scope: "OPERATIONS",
  currentNumber: 1,
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
};

describe("updateFolio", () => {
  it("returns Folio on 200 success", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => baseDto,
    } as Response);

    const result = await updateFolio({ id: "1", body: { name: "Factura actualizada" } }, mockFetch);

    expect(result.id).toBe("1");
    expect(result.name).toBe("Factura actualizada");
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it("throws FolioNotFoundError on 404", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    } as Response);

    await expect(
      updateFolio({ id: "999", body: { name: "X" } }, mockFetch)
    ).rejects.toBeInstanceOf(FolioNotFoundError);
  });

  it("throws FolioCodeAlreadyInUseError on 409", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "Folio code already in use" }),
    } as Response);

    await expect(
      updateFolio({ id: "1", body: { name: "Duplicado" } }, mockFetch)
    ).rejects.toBeInstanceOf(FolioCodeAlreadyInUseError);
  });
});
