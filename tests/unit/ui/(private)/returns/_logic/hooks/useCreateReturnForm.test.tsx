/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import * as servicesModule from "../../../../../../../app/(private)/returns/_logic/services";
import {
  ReturnQuantityExceedsRemainingError,
  SaleNotReturnableError,
} from "../../../../../../../app/(private)/returns/_logic/errors";

jest.mock("../../../../../../../app/(private)/returns/_logic/services");

import { useCreateReturnForm } from "../../../../../../../app/(private)/returns/_logic/hooks/useCreateReturnForm";
import type { SaleDetail } from "../../../../../../../app/(private)/sales/_logic/types/domain";

function makeSale(overrides: Partial<SaleDetail> = {}): SaleDetail {
  return {
    id: "sale-1",
    branchId: "b1",
    cashierId: "u1",
    cashierName: "Cajero",
    folioId: "f1",
    folioNumber: 1,
    folioPrefix: "A",
    paymentMethodId: "pm1",
    paymentMethodName: "Efectivo",
    status: "completed",
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    customerName: "Cliente",
    branchName: "Sucursal",
    items: [
      {
        id: "si1",
        productId: "p1",
        productCodeSnapshot: "COD1",
        productNameSnapshot: "Producto 1",
        priceNameSnapshot: "Precio 1",
        unitPrice: 50,
        quantity: 5,
        discountPct: 0,
        ivaRate: 0.16,
        iepsRate: 0,
        lineSubtotal: 250,
        lineIva: 40,
        lineIeps: 0,
        lineTotal: 290,
      },
    ],
    notes: null,
    cancellationReason: null,
    cancelledAt: null,
    editedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    returnedQuantityBySaleItem: {},
    ...overrides,
  } as SaleDetail;
}

describe("useCreateReturnForm — inicialización", () => {
  it("inicializa lines desde sale.items con quantity=0", () => {
    const sale = makeSale();
    const { result } = renderHook(() => useCreateReturnForm(sale));
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].saleItemId).toBe("si1");
    expect(result.current.lines[0].quantity).toBe(0);
    expect(result.current.lines[0].remaining).toBe(5);
  });

  it("remaining considera returnedQuantityBySaleItem", () => {
    const sale = makeSale({ returnedQuantityBySaleItem: { si1: 2 } });
    const { result } = renderHook(() => useCreateReturnForm(sale));
    expect(result.current.lines[0].remaining).toBe(3);
  });

  it("null sale → lines vacío", () => {
    const { result } = renderHook(() => useCreateReturnForm(null));
    expect(result.current.lines).toHaveLength(0);
    expect(result.current.validationError).toBe("Selecciona al menos un producto");
  });
});

describe("useCreateReturnForm — updateLine", () => {
  it("actualiza la cantidad sin error cuando está en rango", () => {
    const sale = makeSale();
    const { result } = renderHook(() => useCreateReturnForm(sale));
    act(() => result.current.updateLine("si1", 3));
    expect(result.current.lines[0].quantity).toBe(3);
    expect(result.current.lines[0].error).toBeUndefined();
  });

  it("setea error cuando quantity > remaining", () => {
    const sale = makeSale();
    const { result } = renderHook(() => useCreateReturnForm(sale));
    act(() => result.current.updateLine("si1", 10));
    expect(result.current.lines[0].error).toMatch(/Máximo disponible/);
  });

  it("setea error cuando quantity < 0", () => {
    const sale = makeSale();
    const { result } = renderHook(() => useCreateReturnForm(sale));
    act(() => result.current.updateLine("si1", -1));
    expect(result.current.lines[0].error).toMatch(/negativa/i);
  });
});

describe("useCreateReturnForm — validationError", () => {
  it("'Selecciona al menos un producto' cuando todos en 0", () => {
    const sale = makeSale();
    const { result } = renderHook(() => useCreateReturnForm(sale));
    expect(result.current.validationError).toBe("Selecciona al menos un producto");
  });

  it("null cuando al menos uno > 0 y sin errores", () => {
    const sale = makeSale();
    const { result } = renderHook(() => useCreateReturnForm(sale));
    act(() => result.current.updateLine("si1", 2));
    expect(result.current.validationError).toBeNull();
  });

  it("'Hay cantidades inválidas' cuando hay un error inline", () => {
    const sale = makeSale();
    const { result } = renderHook(() => useCreateReturnForm(sale));
    act(() => result.current.updateLine("si1", 99));
    expect(result.current.validationError).toBe("Hay cantidades inválidas");
  });
});

describe("useCreateReturnForm — submit", () => {
  beforeEach(() => jest.clearAllMocks());

  it("submit() filtra lines con quantity > 0 y llama createReturn", async () => {
    const NOW = new Date().toISOString();
    const returnedDetail = { id: "r1" };
    jest.spyOn(servicesModule, "createReturn").mockResolvedValue(returnedDetail as never);

    const sale = makeSale();
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useCreateReturnForm(sale, onSuccess));

    act(() => {
      result.current.updateLine("si1", 2);
      result.current.setReason("Defecto de fabricación");
    });

    await act(async () => { await result.current.submit(); });

    expect(servicesModule.createReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        saleId: "sale-1",
        reason: "Defecto de fabricación",
        items: [{ saleItemId: "si1", quantity: 2 }],
      })
    );
    expect(onSuccess).toHaveBeenCalledWith(returnedDetail);
  });

  it("submit() no hace nada cuando validationError !== null", async () => {
    const sale = makeSale();
    const { result } = renderHook(() => useCreateReturnForm(sale));
    // all lines at quantity=0 → validationError active
    await act(async () => { await result.current.submit(); });
    expect(servicesModule.createReturn).not.toHaveBeenCalled();
  });

  it("submit() con reason vacío → reasonError seteado, sin dispatch", async () => {
    const sale = makeSale();
    const { result } = renderHook(() => useCreateReturnForm(sale));

    act(() => { result.current.updateLine("si1", 2); });
    // reason stays "" (< 3 chars)
    await act(async () => { await result.current.submit(); });

    expect(result.current.reasonError).toBe("El motivo es obligatorio (mín. 3 caracteres)");
    expect(servicesModule.createReturn).not.toHaveBeenCalled();
  });

  it("setReason limpia reasonError", async () => {
    const sale = makeSale();
    const { result } = renderHook(() => useCreateReturnForm(sale));

    act(() => { result.current.updateLine("si1", 2); });
    await act(async () => { await result.current.submit(); }); // triggers reasonError
    expect(result.current.reasonError).not.toBeNull();

    act(() => { result.current.setReason("Motivo válido"); });
    expect(result.current.reasonError).toBeNull();
  });

  it("ReturnQuantityExceedsRemainingError → marca error en la fila y llama onQuantityError", async () => {
    const err = new ReturnQuantityExceedsRemainingError("si1", 5, 3);
    jest.spyOn(servicesModule, "createReturn").mockRejectedValue(err);

    const sale = makeSale();
    const onQuantityError = jest.fn();
    const { result } = renderHook(() => useCreateReturnForm(sale, undefined, onQuantityError));

    act(() => {
      result.current.updateLine("si1", 2);
      result.current.setReason("motivo");
    });

    let thrown: unknown;
    await act(async () => {
      try { await result.current.submit(); } catch (e) { thrown = e; }
    });

    expect(thrown).toBeInstanceOf(ReturnQuantityExceedsRemainingError);
    expect(result.current.lines[0].error).toMatch(/3/);
    expect(onQuantityError).toHaveBeenCalledWith("si1");
  });

  it("SaleNotReturnableError → re-throws sin marcar filas", async () => {
    const err = new SaleNotReturnableError("cancelled");
    jest.spyOn(servicesModule, "createReturn").mockRejectedValue(err);

    const sale = makeSale();
    const { result } = renderHook(() => useCreateReturnForm(sale));

    act(() => {
      result.current.updateLine("si1", 1);
      result.current.setReason("motivo");
    });

    let thrown: unknown;
    await act(async () => {
      try { await result.current.submit(); } catch (e) { thrown = e; }
    });

    expect(thrown).toBeInstanceOf(SaleNotReturnableError);
    expect(result.current.lines[0].error).toBeUndefined();
  });
});
