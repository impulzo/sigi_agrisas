import { renderHook, act } from "@testing-library/react";
import { useBranchMutations } from "../../../../../../../app/(private)/catalogs/branches/_logic/hooks/useBranchMutations";

jest.mock("../../../../../../../app/(private)/catalogs/branches/_logic/services/createBranch", () => ({
  createBranch: jest.fn(),
}));
jest.mock("../../../../../../../app/(private)/catalogs/branches/_logic/services/updateBranch", () => ({
  updateBranch: jest.fn(),
}));
jest.mock("../../../../../../../app/(private)/catalogs/branches/_logic/services/softDeleteBranch", () => ({
  softDeleteBranch: jest.fn(),
}));

import { createBranch } from "../../../../../../../app/(private)/catalogs/branches/_logic/services/createBranch";
import { updateBranch } from "../../../../../../../app/(private)/catalogs/branches/_logic/services/updateBranch";
import { softDeleteBranch } from "../../../../../../../app/(private)/catalogs/branches/_logic/services/softDeleteBranch";

const mockCreate = createBranch as jest.Mock;
const mockUpdate = updateBranch as jest.Mock;
const mockSoftDelete = softDeleteBranch as jest.Mock;

const baseEntity = {
  id: "1",
  code: "MAIN",
  name: "Central",
  address: "Calle 1",
  phone: "555-0000",
  email: "main@example.com",
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("useBranchMutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("createOne éxito: retorna entity", async () => {
    mockCreate.mockResolvedValueOnce(baseEntity);

    const { result } = renderHook(() => useBranchMutations());

    let entity;
    await act(async () => {
      entity = await result.current.createOne({ code: "MAIN", name: "Central" });
    });

    expect(entity).toEqual(baseEntity);
    expect(result.current.mutationError).toBeNull();
  });

  it("createOne error: retorna null, mutationError no nulo", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Branch code already in use"));

    const { result } = renderHook(() => useBranchMutations());

    let entity;
    await act(async () => {
      entity = await result.current.createOne({ code: "MAIN", name: "Central" });
    });

    expect(entity).toBeNull();
    expect(result.current.mutationError).not.toBeNull();
  });

  it("updateOne: llama updateBranch", async () => {
    mockUpdate.mockResolvedValueOnce({ ...baseEntity, name: "Central actualizada" });

    const { result } = renderHook(() => useBranchMutations());

    let entity;
    await act(async () => {
      entity = await result.current.updateOne("1", { name: "Central actualizada" });
    });

    expect(mockUpdate).toHaveBeenCalledWith({ id: "1", body: { name: "Central actualizada" } });
    expect(entity).not.toBeNull();
  });

  it("softDeleteOne: llama softDeleteBranch y retorna true", async () => {
    mockSoftDelete.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useBranchMutations());

    let success;
    await act(async () => {
      success = await result.current.softDeleteOne("1");
    });

    expect(mockSoftDelete).toHaveBeenCalledWith({ id: "1" });
    expect(success).toBe(true);
  });

  it("reactivateOne: llama updateBranch con { isActive: true }", async () => {
    mockUpdate.mockResolvedValueOnce({ ...baseEntity, isActive: true });

    const { result } = renderHook(() => useBranchMutations());

    await act(async () => {
      await result.current.reactivateOne("1");
    });

    expect(mockUpdate).toHaveBeenCalledWith({ id: "1", body: { isActive: true } });
  });
});
