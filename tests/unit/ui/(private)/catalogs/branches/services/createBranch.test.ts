import { createBranch } from "../../../../../../../app/(private)/catalogs/branches/_logic/services/createBranch";
import { NetworkError } from "../../../../../../../app/_lib/authFetch";
import { BranchCodeAlreadyInUseError } from "../../../../../../../app/(private)/catalogs/branches/_logic/errors";

const baseDto = {
  id: "1",
  code: "MAIN",
  name: "Central",
  address: "Calle 1",
  phone: "555-0000",
  email: "main@example.com",
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("createBranch", () => {
  it("returns Branch on 201 success", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => baseDto,
    } as Response);

    const result = await createBranch({ body: { code: "MAIN", name: "Central" } }, mockFetch);

    expect(result.id).toBe("1");
    expect(result.code).toBe("MAIN");
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("throws BranchCodeAlreadyInUseError on 409", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "Branch code already in use" }),
    } as Response);

    await expect(
      createBranch({ body: { code: "MAIN", name: "Central" } }, mockFetch)
    ).rejects.toBeInstanceOf(BranchCodeAlreadyInUseError);
  });

  it("throws NetworkError on 400", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Bad request" }),
    } as Response);

    await expect(
      createBranch({ body: { code: "MAIN", name: "Central" } }, mockFetch)
    ).rejects.toBeInstanceOf(NetworkError);
  });
});
