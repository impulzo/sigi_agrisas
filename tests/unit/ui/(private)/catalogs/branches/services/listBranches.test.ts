import { listBranches } from "../../../../../../../app/(private)/catalogs/branches/_logic/services/listBranches";
import { UnauthenticatedError, ForbiddenError, NetworkError } from "../../../../../../../app/_lib/authFetch";

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

describe("listBranches", () => {
  it("returns items with dates parsed as Date on success 200", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [baseDto], total: 1, page: 1, pageSize: 20 }),
    } as Response);

    const result = await listBranches({ page: 1, pageSize: 20 }, mockFetch);

    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("1");
    expect(result.items[0].createdAt).toBeInstanceOf(Date);
    expect(result.items[0].updatedAt).toBeInstanceOf(Date);
  });

  it("handles email: null in the response", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [{ ...baseDto, email: null }], total: 1, page: 1, pageSize: 20 }),
    } as Response);

    const result = await listBranches({ page: 1, pageSize: 20 }, mockFetch);

    expect(result.items[0].email).toBeNull();
  });

  it("includes includeInactive=true in the URL when option is set", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
    } as Response);

    await listBranches({ page: 1, pageSize: 20, includeInactive: true }, mockFetch);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("includeInactive=true");
  });

  it("throws UnauthenticatedError on 401", async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce(new UnauthenticatedError());

    await expect(listBranches({ page: 1, pageSize: 20 }, mockFetch)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("throws ForbiddenError on 403", async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce(new ForbiddenError("branches:read"));

    await expect(listBranches({ page: 1, pageSize: 20 }, mockFetch)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws NetworkError on network failure", async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce(new NetworkError());

    await expect(listBranches({ page: 1, pageSize: 20 }, mockFetch)).rejects.toBeInstanceOf(NetworkError);
  });

  it("parses createdAt and updatedAt as Date instances", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [baseDto], total: 1, page: 1, pageSize: 20 }),
    } as Response);

    const result = await listBranches({ page: 1, pageSize: 20 }, mockFetch);

    expect(result.items[0].createdAt).toEqual(new Date("2024-01-01T00:00:00.000Z"));
    expect(result.items[0].updatedAt).toEqual(new Date("2024-01-01T00:00:00.000Z"));
  });
});
