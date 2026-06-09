import { softDeleteProvider } from "../../../../../../../app/(private)/catalogs/providers/_logic/services/softDeleteProvider";
import { ProviderNotFoundError } from "../../../../../../../app/(private)/catalogs/providers/_logic/errors";

describe("softDeleteProvider", () => {
  it("resolves to void on 204", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
    } as Response);

    await expect(softDeleteProvider({ id: "1" }, mockFetch)).resolves.toBeUndefined();
  });

  it("throws ProviderNotFoundError on 404", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Provider not found" }),
    } as Response);

    await expect(softDeleteProvider({ id: "missing" }, mockFetch)).rejects.toBeInstanceOf(ProviderNotFoundError);
  });
});
