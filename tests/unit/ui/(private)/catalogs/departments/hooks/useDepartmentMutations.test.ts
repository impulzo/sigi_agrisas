import { renderHook, act } from "@testing-library/react";
import { useDepartmentMutations } from "../../../../../../../app/(private)/catalogs/departments/_logic/hooks/useDepartmentMutations";

jest.mock("../../../../../../../app/(private)/catalogs/departments/_logic/services/createDepartment", () => ({
  createDepartment: jest.fn(),
}));
jest.mock("../../../../../../../app/(private)/catalogs/departments/_logic/services/updateDepartment", () => ({
  updateDepartment: jest.fn(),
}));
jest.mock("../../../../../../../app/(private)/catalogs/departments/_logic/services/softDeleteDepartment", () => ({
  softDeleteDepartment: jest.fn(),
}));

import { createDepartment } from "../../../../../../../app/(private)/catalogs/departments/_logic/services/createDepartment";
import { updateDepartment } from "../../../../../../../app/(private)/catalogs/departments/_logic/services/updateDepartment";
import { softDeleteDepartment } from "../../../../../../../app/(private)/catalogs/departments/_logic/services/softDeleteDepartment";

const mockCreate = createDepartment as jest.Mock;
const mockUpdate = updateDepartment as jest.Mock;
const mockSoftDelete = softDeleteDepartment as jest.Mock;

const baseEntity = {
  id: "1",
  code: "SALES",
  name: "Ventas",
  description: "Departamento de ventas",
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("useDepartmentMutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("createOne éxito: retorna entity", async () => {
    mockCreate.mockResolvedValueOnce(baseEntity);

    const { result } = renderHook(() => useDepartmentMutations());

    let entity;
    await act(async () => {
      entity = await result.current.createOne({ code: "SALES", name: "Ventas" });
    });

    expect(entity).toEqual(baseEntity);
    expect(result.current.mutationError).toBeNull();
  });

  it("createOne error: retorna null, mutationError no nulo", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Department code already in use"));

    const { result } = renderHook(() => useDepartmentMutations());

    let entity;
    await act(async () => {
      entity = await result.current.createOne({ code: "SALES", name: "Ventas" });
    });

    expect(entity).toBeNull();
    expect(result.current.mutationError).not.toBeNull();
  });

  it("updateOne: llama updateDepartment", async () => {
    mockUpdate.mockResolvedValueOnce({ ...baseEntity, name: "Ventas actualizado" });

    const { result } = renderHook(() => useDepartmentMutations());

    let entity;
    await act(async () => {
      entity = await result.current.updateOne("1", { name: "Ventas actualizado" });
    });

    expect(mockUpdate).toHaveBeenCalledWith({ id: "1", body: { name: "Ventas actualizado" } });
    expect(entity).not.toBeNull();
  });

  it("softDeleteOne: llama softDeleteDepartment y retorna true", async () => {
    mockSoftDelete.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDepartmentMutations());

    let success;
    await act(async () => {
      success = await result.current.softDeleteOne("1");
    });

    expect(mockSoftDelete).toHaveBeenCalledWith({ id: "1" });
    expect(success).toBe(true);
  });

  it("reactivateOne: llama updateDepartment con { isActive: true }", async () => {
    mockUpdate.mockResolvedValueOnce({ ...baseEntity, isActive: true });

    const { result } = renderHook(() => useDepartmentMutations());

    await act(async () => {
      await result.current.reactivateOne("1");
    });

    expect(mockUpdate).toHaveBeenCalledWith({ id: "1", body: { isActive: true } });
  });
});
