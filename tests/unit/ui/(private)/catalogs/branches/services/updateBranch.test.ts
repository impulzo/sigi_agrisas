import { updateBranch } from "../../../../../../../app/(private)/catalogs/branches/_logic/services/updateBranch";
import {
  BranchNotFoundError,
  BranchCodeAlreadyInUseError,
} from "../../../../../../../app/(private)/catalogs/branches/_logic/errors";

const baseDto = {
  id: "1",
  code: "MAIN",
  name: "Central actualizada",
  address: "Calle 1",
  phone: "555-0000",
  email: "main@example.com",
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
};

describe("updateBranch", () => {
  it("returns Branch on 200 success", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => baseDto,
    } as Response);

    const result = await updateBranch({ id: "1", body: { name: "Central actualizada" } }, mockFetch);

    expect(result.id).toBe("1");
    expect(result.name).toBe("Central actualizada");
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it("throws BranchNotFoundError on 404", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    } as Response);

    await expect(
      updateBranch({ id: "999", body: { name: "X" } }, mockFetch)
    ).rejects.toBeInstanceOf(BranchNotFoundError);
  });

  it("throws BranchCodeAlreadyInUseError on 409", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "Branch code already in use" }),
    } as Response);

    await expect(
      updateBranch({ id: "1", body: { name: "Duplicado" } }, mockFetch)
    ).rejects.toBeInstanceOf(BranchCodeAlreadyInUseError);
  });
});
