/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("../../../../../app/(private)/waybills/_logic/services", () => ({
  createWaybill: jest.fn(),
}));

import { useCreateWaybillForm } from "../../../../../app/(private)/waybills/_logic/hooks/useCreateWaybillForm";
import { createWaybill } from "../../../../../app/(private)/waybills/_logic/services";
import { InsufficientStockAtOriginError } from "../../../../../app/(private)/waybills/_logic/errors";

const mockCreate = createWaybill as jest.MockedFunction<typeof createWaybill>;

const PRODUCT_ID = "33333333-3333-3333-3333-333333333333";
const ORIGIN_ID = "11111111-1111-1111-1111-111111111111";
const DEST_ID = "22222222-2222-2222-2222-222222222222";

function fillValidForm(result: { current: ReturnType<typeof useCreateWaybillForm> }) {
  act(() => {
    result.current.setOriginBranchId(ORIGIN_ID);
    result.current.setDestinationBranchId(DEST_ID);
    result.current.setVehicleField("plate", "ABC1234");
    result.current.setVehicleField("config", "C2");
    result.current.setVehicleField("permitType", "TPAF01");
    result.current.setVehicleField("permitNumber", "SCT-1");
    result.current.setVehicleField("insuranceCompany", "Aseguradora SA");
    result.current.setVehicleField("insurancePolicy", "POL-1");
    result.current.setDriverField("name", "Juan Perez");
    result.current.setDriverField("licenseNumber", "LIC-1");
    result.current.setDistanceKm(50);
    result.current.setDepartureAt("2026-08-01T08:00");
    result.current.setArrivalAt("2026-08-01T12:00");
    result.current.addLine({
      productId: PRODUCT_ID,
      description: "Fertilizante",
      satBienesTranspCode: "10161500",
      satUnitCode: "KGM",
      quantity: 10,
      weightKg: 100,
      isHazardousMaterial: false,
      hazardousMaterialCode: "",
    });
  });
}

describe("useCreateWaybillForm", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects submit when origin and destination are the same branch (Zod validation)", async () => {
    const { result } = renderHook(() => useCreateWaybillForm());
    fillValidForm(result);
    act(() => {
      result.current.setDestinationBranchId(ORIGIN_ID);
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.error).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("rejects submit with no lines (Zod validation)", async () => {
    const { result } = renderHook(() => useCreateWaybillForm());
    fillValidForm(result);
    act(() => {
      result.current.removeLine(result.current.lines[0]._key);
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.error).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("submits successfully and redirects to detail", async () => {
    mockCreate.mockResolvedValue({ id: "wb-1" } as Awaited<ReturnType<typeof mockCreate>>);
    const { result } = renderHook(() => useCreateWaybillForm());
    fillValidForm(result);

    await act(async () => {
      await result.current.submit();
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it("on InsufficientStockAtOriginError, flags the offending line without clearing the form", async () => {
    mockCreate.mockRejectedValue(new InsufficientStockAtOriginError(PRODUCT_ID));
    const { result } = renderHook(() => useCreateWaybillForm());
    fillValidForm(result);

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.error).toBeInstanceOf(InsufficientStockAtOriginError);
    expect(result.current.lines[0].error).toBe("Stock insuficiente en la sucursal de origen");
    // Form state preserved — nothing cleared
    expect(result.current.originBranchId).toBe(ORIGIN_ID);
    expect(result.current.lines).toHaveLength(1);
  });

  it("on generic error, preserves all form state for retry", async () => {
    mockCreate.mockRejectedValue(new Error("Facturama rejected"));
    const { result } = renderHook(() => useCreateWaybillForm());
    fillValidForm(result);

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.originBranchId).toBe(ORIGIN_ID);
    expect(result.current.destinationBranchId).toBe(DEST_ID);
    expect(result.current.vehicle.plate).toBe("ABC1234");
    expect(result.current.lines).toHaveLength(1);
  });

  it("hazardous material line without code fails Zod validation", async () => {
    const { result } = renderHook(() => useCreateWaybillForm());
    fillValidForm(result);
    act(() => {
      result.current.updateLine(result.current.lines[0]._key, {
        isHazardousMaterial: true,
        hazardousMaterialCode: "",
      });
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.error).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
