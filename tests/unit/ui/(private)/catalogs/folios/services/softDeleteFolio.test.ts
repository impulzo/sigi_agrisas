import { softDeleteFolio } from "../../../../../../../app/(private)/catalogs/folios/_logic/services/softDeleteFolio";
import { FolioNotFoundError } from "../../../../../../../app/(private)/catalogs/folios/_logic/errors";

describe("softDeleteFolio", () => {
  it("returns void (undefined) on 204", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    } as Response);

    const result = await softDeleteFolio({ id: "1" }, mockFetch);

    expect(result).toBeUndefined();
  });

  it("throws FolioNotFoundError on 404", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    } as Response);

    await expect(softDeleteFolio({ id: "999" }, mockFetch)).rejects.toBeInstanceOf(FolioNotFoundError);
  });
});
