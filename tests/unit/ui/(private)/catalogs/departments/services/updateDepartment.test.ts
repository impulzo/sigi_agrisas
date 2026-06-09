import { updateDepartment } from "../../../../../../../app/(private)/catalogs/departments/_logic/services/updateDepartment";
import {
  DepartmentNotFoundError,
  DepartmentCodeAlreadyInUseError,
} from "../../../../../../../app/(private)/catalogs/departments/_logic/errors";

const baseDto = {
  id: "1",
  code: "SALES",
  name: "Ventas actualizado",
  description: "Departamento de ventas",
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
};

describe("updateDepartment", () => {
  it("returns Department on 200 success", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => baseDto,
    } as Response);

    const result = await updateDepartment({ id: "1", body: { name: "Ventas actualizado" } }, mockFetch);

    expect(result.id).toBe("1");
    expect(result.name).toBe("Ventas actualizado");
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it("throws DepartmentNotFoundError on 404", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    } as Response);

    await expect(
      updateDepartment({ id: "999", body: { name: "X" } }, mockFetch)
    ).rejects.toBeInstanceOf(DepartmentNotFoundError);
  });

  it("throws DepartmentCodeAlreadyInUseError on 409", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "Department code already in use" }),
    } as Response);

    await expect(
      updateDepartment({ id: "1", body: { name: "Duplicado" } }, mockFetch)
    ).rejects.toBeInstanceOf(DepartmentCodeAlreadyInUseError);
  });
});
