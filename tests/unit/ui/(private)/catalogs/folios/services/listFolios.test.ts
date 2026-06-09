import { listFolios } from "../../../../../../../app/(private)/catalogs/folios/_logic/services/listFolios";
import { UnauthenticatedError, ForbiddenError, NetworkError } from "../../../../../../../app/_lib/authFetch";

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

describe("listFolios", () => {
  it("returns items with dates parsed as Date on success 200", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [baseDto], total: 1, page: 1, pageSize: 20 }),
    } as Response);

    const result = await listFolios({ page: 1, pageSize: 20 }, mockFetch);

    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("1");
    expect(result.items[0].createdAt).toBeInstanceOf(Date);
    expect(result.items[0].updatedAt).toBeInstanceOf(Date);
  });

  it("parses currentNumber as a number (not string)", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [{ ...baseDto, currentNumber: 42 }], total: 1, page: 1, pageSize: 20 }),
    } as Response);

    const result = await listFolios({ page: 1, pageSize: 20 }, mockFetch);

    expect(typeof result.items[0].currentNumber).toBe("number");
    expect(result.items[0].currentNumber).toBe(42);
  });

  it("includes includeInactive=true in the URL when option is set", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
    } as Response);

    await listFolios({ page: 1, pageSize: 20, includeInactive: true }, mockFetch);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("includeInactive=true");
  });

  it("throws UnauthenticatedError on 401", async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce(new UnauthenticatedError());

    await expect(listFolios({ page: 1, pageSize: 20 }, mockFetch)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("throws ForbiddenError on 403", async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce(new ForbiddenError("folios:read"));

    await expect(listFolios({ page: 1, pageSize: 20 }, mockFetch)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws NetworkError on network failure", async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce(new NetworkError());

    await expect(listFolios({ page: 1, pageSize: 20 }, mockFetch)).rejects.toBeInstanceOf(NetworkError);
  });

  it("parses createdAt and updatedAt as Date instances", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [baseDto], total: 1, page: 1, pageSize: 20 }),
    } as Response);

    const result = await listFolios({ page: 1, pageSize: 20 }, mockFetch);

    expect(result.items[0].createdAt).toEqual(new Date("2024-01-01T00:00:00.000Z"));
    expect(result.items[0].updatedAt).toEqual(new Date("2024-01-01T00:00:00.000Z"));
  });
});
