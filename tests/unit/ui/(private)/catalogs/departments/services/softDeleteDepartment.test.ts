import { softDeleteDepartment } from "../../../../../../../app/(private)/catalogs/departments/_logic/services/softDeleteDepartment";
import { DepartmentNotFoundError } from "../../../../../../../app/(private)/catalogs/departments/_logic/errors";

describe("softDeleteDepartment", () => {
  it("returns void (undefined) on 204", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    } as Response);

    const result = await softDeleteDepartment({ id: "1" }, mockFetch);

    expect(result).toBeUndefined();
  });

  it("throws DepartmentNotFoundError on 404", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    } as Response);

    await expect(softDeleteDepartment({ id: "999" }, mockFetch)).rejects.toBeInstanceOf(DepartmentNotFoundError);
  });
});
