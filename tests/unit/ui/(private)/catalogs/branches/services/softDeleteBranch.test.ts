import { softDeleteBranch } from "../../../../../../../app/(private)/catalogs/branches/_logic/services/softDeleteBranch";
import { BranchNotFoundError } from "../../../../../../../app/(private)/catalogs/branches/_logic/errors";

describe("softDeleteBranch", () => {
  it("returns void (undefined) on 204", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    } as Response);

    const result = await softDeleteBranch({ id: "1" }, mockFetch);

    expect(result).toBeUndefined();
  });

  it("throws BranchNotFoundError on 404", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    } as Response);

    await expect(softDeleteBranch({ id: "999" }, mockFetch)).rejects.toBeInstanceOf(BranchNotFoundError);
  });
});
