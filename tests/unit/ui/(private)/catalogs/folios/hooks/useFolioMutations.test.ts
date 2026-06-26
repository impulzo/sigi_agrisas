import { renderHook, act } from "@testing-library/react";
import { useFolioMutations } from "../../../../../../../app/(private)/catalogs/folios/_logic/hooks/useFolioMutations";

jest.mock("../../../../../../../app/(private)/catalogs/folios/_logic/services/createFolio", () => ({
  createFolio: jest.fn(),
}));
jest.mock("../../../../../../../app/(private)/catalogs/folios/_logic/services/updateFolio", () => ({
  updateFolio: jest.fn(),
}));
jest.mock("../../../../../../../app/(private)/catalogs/folios/_logic/services/softDeleteFolio", () => ({
  softDeleteFolio: jest.fn(),
}));

import { createFolio } from "../../../../../../../app/(private)/catalogs/folios/_logic/services/createFolio";
import { updateFolio } from "../../../../../../../app/(private)/catalogs/folios/_logic/services/updateFolio";
import { softDeleteFolio } from "../../../../../../../app/(private)/catalogs/folios/_logic/services/softDeleteFolio";

const mockCreate = createFolio as jest.Mock;
const mockUpdate = updateFolio as jest.Mock;
const mockSoftDelete = softDeleteFolio as jest.Mock;

const baseEntity = {
  id: "1",
  code: "FAC",
  name: "Factura",
  prefix: "FAC-",
  scope: "OPERATIONS" as const,
  currentNumber: 1,
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("useFolioMutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("createOne éxito: retorna entity", async () => {
    mockCreate.mockResolvedValueOnce(baseEntity);

    const { result } = renderHook(() => useFolioMutations());

    let entity;
    await act(async () => {
      entity = await result.current.createOne({ code: "FAC", name: "Factura", scope: "OPERATIONS" });
    });

    expect(entity).toEqual(baseEntity);
    expect(result.current.mutationError).toBeNull();
  });

  it("createOne error: retorna null, mutationError no nulo", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Folio code already in use"));

    const { result } = renderHook(() => useFolioMutations());

    let entity;
    await act(async () => {
      entity = await result.current.createOne({ code: "FAC", name: "Factura", scope: "OPERATIONS" });
    });

    expect(entity).toBeNull();
    expect(result.current.mutationError).not.toBeNull();
  });

  it("updateOne: llama updateFolio", async () => {
    mockUpdate.mockResolvedValueOnce({ ...baseEntity, name: "Factura actualizada" });

    const { result } = renderHook(() => useFolioMutations());

    let entity;
    await act(async () => {
      entity = await result.current.updateOne("1", { name: "Factura actualizada" });
    });

    expect(mockUpdate).toHaveBeenCalledWith({ id: "1", body: { name: "Factura actualizada" } });
    expect(entity).not.toBeNull();
  });

  it("softDeleteOne: llama softDeleteFolio y retorna true", async () => {
    mockSoftDelete.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useFolioMutations());

    let success;
    await act(async () => {
      success = await result.current.softDeleteOne("1");
    });

    expect(mockSoftDelete).toHaveBeenCalledWith({ id: "1" });
    expect(success).toBe(true);
  });

  it("reactivateOne: llama updateFolio con { isActive: true }", async () => {
    mockUpdate.mockResolvedValueOnce({ ...baseEntity, isActive: true });

    const { result } = renderHook(() => useFolioMutations());

    await act(async () => {
      await result.current.reactivateOne("1");
    });

    expect(mockUpdate).toHaveBeenCalledWith({ id: "1", body: { isActive: true } });
  });
});
