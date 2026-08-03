import { renderHook, act } from "@testing-library/react";
import { useCustomerMutations } from "../../../../../../../app/(private)/catalogs/customers/_logic/hooks/useCustomerMutations";
import {
  CustomerCodeAlreadyInUseError,
  CustomerRfcAlreadyInUseError,
} from "../../../../../../../app/(private)/catalogs/customers/_logic/errors";

jest.mock("../../../../../../../app/(private)/catalogs/customers/_logic/services/createCustomer", () => ({
  createCustomer: jest.fn(),
}));
jest.mock("../../../../../../../app/(private)/catalogs/customers/_logic/services/updateCustomer", () => ({
  updateCustomer: jest.fn(),
}));
jest.mock("../../../../../../../app/(private)/catalogs/customers/_logic/services/softDeleteCustomer", () => ({
  softDeleteCustomer: jest.fn(),
}));

import { createCustomer } from "../../../../../../../app/(private)/catalogs/customers/_logic/services/createCustomer";
import { updateCustomer } from "../../../../../../../app/(private)/catalogs/customers/_logic/services/updateCustomer";
import { softDeleteCustomer } from "../../../../../../../app/(private)/catalogs/customers/_logic/services/softDeleteCustomer";

const mockCreate = createCustomer as jest.Mock;
const mockUpdate = updateCustomer as jest.Mock;
const mockSoftDelete = softDeleteCustomer as jest.Mock;

const baseEntity = {
  id: "1",
  code: "CLI_001",
  name: "Cliente ACME",
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
  creditLimit: null,
  currentBalance: 0,
  creditDays: 30,
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("useCustomerMutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("createOne success: returns entity, no mutation error", async () => {
    mockCreate.mockResolvedValueOnce(baseEntity);

    const { result } = renderHook(() => useCustomerMutations());

    let entity;
    await act(async () => {
      entity = await result.current.createOne({ code: "CLI_001", name: "Acme", rfc: "SAC120101A12" });
    });

    expect(entity).toEqual(baseEntity);
    expect(result.current.mutationError).toBeNull();
  });

  it("createOne re-throws CustomerCodeAlreadyInUseError on duplicate code", async () => {
    mockCreate.mockRejectedValueOnce(new CustomerCodeAlreadyInUseError());

    const { result } = renderHook(() => useCustomerMutations());

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.createOne({ code: "CLI_001", name: "Acme", rfc: "SAC120101A12" });
      } catch (err) {
        caught = err as Error;
      }
    });

    expect(caught).toBeInstanceOf(CustomerCodeAlreadyInUseError);
  });

  it("createOne re-throws CustomerRfcAlreadyInUseError on duplicate rfc", async () => {
    mockCreate.mockRejectedValueOnce(new CustomerRfcAlreadyInUseError());

    const { result } = renderHook(() => useCustomerMutations());

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.createOne({ code: "CLI_001", name: "Acme", rfc: "SAC120101A12" });
      } catch (err) {
        caught = err as Error;
      }
    });

    expect(caught).toBeInstanceOf(CustomerRfcAlreadyInUseError);
  });

  it("createOne generic error: returns null, sets mutationError", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Boom"));

    const { result } = renderHook(() => useCustomerMutations());

    let entity;
    await act(async () => {
      entity = await result.current.createOne({ code: "CLI_001", name: "Acme", rfc: "SAC120101A12" });
    });

    expect(entity).toBeNull();
    expect(result.current.mutationError).toBe("Boom");
  });

  it("updateOne with empty body returns null without dispatching", async () => {
    const { result } = renderHook(() => useCustomerMutations());

    let entity;
    await act(async () => {
      entity = await result.current.updateOne("1", {});
    });

    expect(entity).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("updateOne success returns updated entity", async () => {
    mockUpdate.mockResolvedValueOnce({ ...baseEntity, creditDays: 60 });

    const { result } = renderHook(() => useCustomerMutations());

    let entity;
    await act(async () => {
      entity = await result.current.updateOne("1", { creditDays: 60 });
    });

    expect(mockUpdate).toHaveBeenCalledWith({ id: "1", body: { creditDays: 60 } });
    expect(entity).not.toBeNull();
  });

  it("updateOne re-throws CustomerRfcAlreadyInUseError", async () => {
    mockUpdate.mockRejectedValueOnce(new CustomerRfcAlreadyInUseError());

    const { result } = renderHook(() => useCustomerMutations());

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.updateOne("1", { rfc: "XYZ010101000" });
      } catch (err) {
        caught = err as Error;
      }
    });

    expect(caught).toBeInstanceOf(CustomerRfcAlreadyInUseError);
  });

  it("softDeleteOne returns true on success", async () => {
    mockSoftDelete.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useCustomerMutations());

    let ok;
    await act(async () => {
      ok = await result.current.softDeleteOne("1");
    });

    expect(mockSoftDelete).toHaveBeenCalledWith({ id: "1" });
    expect(ok).toBe(true);
  });

  it("reactivateOne calls update with { isActive: true }", async () => {
    mockUpdate.mockResolvedValueOnce({ ...baseEntity, isActive: true });

    const { result } = renderHook(() => useCustomerMutations());

    await act(async () => {
      await result.current.reactivateOne("1");
    });

    expect(mockUpdate).toHaveBeenCalledWith({ id: "1", body: { isActive: true } });
  });
});
