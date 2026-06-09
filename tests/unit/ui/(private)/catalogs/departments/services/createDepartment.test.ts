import { createDepartment } from "../../../../../../../app/(private)/catalogs/departments/_logic/services/createDepartment";
import { NetworkError } from "../../../../../../../app/_lib/authFetch";
import { DepartmentCodeAlreadyInUseError } from "../../../../../../../app/(private)/catalogs/departments/_logic/errors";

const baseDto = {
  id: "1",
  code: "SALES",
  name: "Ventas",
  description: "Departamento de ventas",
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("createDepartment", () => {
  it("returns Department on 201 success", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => baseDto,
    } as Response);

    const result = await createDepartment({ body: { code: "SALES", name: "Ventas" } }, mockFetch);

    expect(result.id).toBe("1");
    expect(result.code).toBe("SALES");
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("throws DepartmentCodeAlreadyInUseError on 409", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "Department code already in use" }),
    } as Response);

    await expect(
      createDepartment({ body: { code: "SALES", name: "Ventas" } }, mockFetch)
    ).rejects.toBeInstanceOf(DepartmentCodeAlreadyInUseError);
  });

  it("throws NetworkError on 400", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Bad request" }),
    } as Response);

    await expect(
      createDepartment({ body: { code: "SALES", name: "Ventas" } }, mockFetch)
    ).rejects.toBeInstanceOf(NetworkError);
  });
});
