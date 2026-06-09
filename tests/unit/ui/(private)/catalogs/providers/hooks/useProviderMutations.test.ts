import { renderHook, act } from "@testing-library/react";
import { useProviderMutations } from "../../../../../../../app/(private)/catalogs/providers/_logic/hooks/useProviderMutations";
import {
  ProviderCodeAlreadyInUseError,
  ProviderRfcAlreadyInUseError,
} from "../../../../../../../app/(private)/catalogs/providers/_logic/errors";

jest.mock("../../../../../../../app/(private)/catalogs/providers/_logic/services/createProvider", () => ({
  createProvider: jest.fn(),
}));
jest.mock("../../../../../../../app/(private)/catalogs/providers/_logic/services/updateProvider", () => ({
  updateProvider: jest.fn(),
}));
jest.mock("../../../../../../../app/(private)/catalogs/providers/_logic/services/softDeleteProvider", () => ({
  softDeleteProvider: jest.fn(),
}));

import { createProvider } from "../../../../../../../app/(private)/catalogs/providers/_logic/services/createProvider";
import { updateProvider } from "../../../../../../../app/(private)/catalogs/providers/_logic/services/updateProvider";
import { softDeleteProvider } from "../../../../../../../app/(private)/catalogs/providers/_logic/services/softDeleteProvider";

const mockCreate = createProvider as jest.Mock;
const mockUpdate = updateProvider as jest.Mock;
const mockSoftDelete = softDeleteProvider as jest.Mock;

const baseEntity = {
  id: "1",
  code: "PROV_001",
  name: "Semillas ACME",
  rfc: "SAC120101A12",
  legalName: null,
  taxRegime: null,
  cfdiUse: null,
  taxZipCode: null,
  email: null,
  phone: null,
  address: null,
  contactName: null,
  notes: null,
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("useProviderMutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("createOne success: returns entity, no mutation error", async () => {
    mockCreate.mockResolvedValueOnce(baseEntity);

    const { result } = renderHook(() => useProviderMutations());

    let entity;
    await act(async () => {
      entity = await result.current.createOne({ code: "PROV_001", name: "Acme", rfc: "SAC120101A12" });
    });

    expect(entity).toEqual(baseEntity);
    expect(result.current.mutationError).toBeNull();
  });

  it("createOne re-throws ProviderCodeAlreadyInUseError on duplicate code", async () => {
    mockCreate.mockRejectedValueOnce(new ProviderCodeAlreadyInUseError());

    const { result } = renderHook(() => useProviderMutations());

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.createOne({ code: "PROV_001", name: "Acme", rfc: "SAC120101A12" });
      } catch (err) {
        caught = err as Error;
      }
    });

    expect(caught).toBeInstanceOf(ProviderCodeAlreadyInUseError);
  });

  it("createOne re-throws ProviderRfcAlreadyInUseError on duplicate rfc", async () => {
    mockCreate.mockRejectedValueOnce(new ProviderRfcAlreadyInUseError());

    const { result } = renderHook(() => useProviderMutations());

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.createOne({ code: "PROV_001", name: "Acme", rfc: "SAC120101A12" });
      } catch (err) {
        caught = err as Error;
      }
    });

    expect(caught).toBeInstanceOf(ProviderRfcAlreadyInUseError);
  });

  it("createOne generic error: returns null, sets mutationError", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Boom"));

    const { result } = renderHook(() => useProviderMutations());

    let entity;
    await act(async () => {
      entity = await result.current.createOne({ code: "PROV_001", name: "Acme", rfc: "SAC120101A12" });
    });

    expect(entity).toBeNull();
    expect(result.current.mutationError).toBe("Boom");
  });

  it("updateOne with empty body returns null without dispatching", async () => {
    const { result } = renderHook(() => useProviderMutations());

    let entity;
    await act(async () => {
      entity = await result.current.updateOne("1", {});
    });

    expect(entity).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("updateOne success returns updated entity", async () => {
    mockUpdate.mockResolvedValueOnce({ ...baseEntity, name: "Acme Renombrado" });

    const { result } = renderHook(() => useProviderMutations());

    let entity;
    await act(async () => {
      entity = await result.current.updateOne("1", { name: "Acme Renombrado" });
    });

    expect(mockUpdate).toHaveBeenCalledWith({ id: "1", body: { name: "Acme Renombrado" } });
    expect(entity).not.toBeNull();
  });

  it("updateOne re-throws ProviderRfcAlreadyInUseError", async () => {
    mockUpdate.mockRejectedValueOnce(new ProviderRfcAlreadyInUseError());

    const { result } = renderHook(() => useProviderMutations());

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.updateOne("1", { rfc: "XYZ010101000" });
      } catch (err) {
        caught = err as Error;
      }
    });

    expect(caught).toBeInstanceOf(ProviderRfcAlreadyInUseError);
  });

  it("softDeleteOne returns true on success", async () => {
    mockSoftDelete.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useProviderMutations());

    let ok;
    await act(async () => {
      ok = await result.current.softDeleteOne("1");
    });

    expect(mockSoftDelete).toHaveBeenCalledWith({ id: "1" });
    expect(ok).toBe(true);
  });

  it("reactivateOne calls update with { isActive: true }", async () => {
    mockUpdate.mockResolvedValueOnce({ ...baseEntity, isActive: true });

    const { result } = renderHook(() => useProviderMutations());

    await act(async () => {
      await result.current.reactivateOne("1");
    });

    expect(mockUpdate).toHaveBeenCalledWith({ id: "1", body: { isActive: true } });
  });
});
