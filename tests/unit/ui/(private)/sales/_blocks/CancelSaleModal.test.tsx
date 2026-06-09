/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CancelSaleModal } from "../../../../../../app/(private)/sales/_blocks/CancelSaleModal";
import type { SaleDetail } from "../../../../../../app/(private)/sales/_logic/types/domain";

function makeSale(status: "completed" | "cancelled" | "edited", cancellationReason?: string): SaleDetail {
  return {
    id: "s1",
    branchId: "b1",
    cashierId: "u1",
    cashierName: "Operador",
    folioId: "f1",
    folioNumber: 1,
    folioPrefix: "A",
    paymentMethodId: "pm1",
    status,
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    paidAmount: 116,
    paymentStatus: "paid",
    isCredit: false,
    customerName: null,
    branchName: "Central",
    items: [],
    notes: null,
    cancellationReason: cancellationReason ?? null,
    cancelledAt: status === "cancelled" ? new Date() : null,
    editedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    returnedQuantityBySaleItem: {},
  };
}

describe("CancelSaleModal — idempotencia visual", () => {
  it("muestra 'Venta ya cancelada' cuando status=cancelled (idempotente)", () => {
    render(
      <CancelSaleModal
        sale={makeSale("cancelled", "Cliente cambió de opinión")}
        isSaving={false}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("Venta ya cancelada")).toBeInTheDocument();
    expect(screen.getByText("Cancelada")).toBeInTheDocument(); // badge
    expect(screen.getByText(/Cliente cambió de opinión/i)).toBeInTheDocument();
  });

  it("muestra sólo botón Cerrar (sin confirmar) cuando ya está cancelada", () => {
    render(
      <CancelSaleModal
        sale={makeSale("cancelled")}
        isSaving={false}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /Cerrar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirmar cancelación/i })).not.toBeInTheDocument();
  });

  it("muestra formulario de cancelación cuando status=completed", () => {
    render(
      <CancelSaleModal
        sale={makeSale("completed")}
        isSaving={false}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("Cancelar venta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirmar cancelación/i })).toBeInTheDocument();
  });

  it("llama onConfirm con el motivo ingresado", async () => {
    const onConfirm = jest.fn();
    render(
      <CancelSaleModal
        sale={makeSale("completed")}
        isSaving={false}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />
    );
    await userEvent.setup().type(screen.getByPlaceholderText(/Describe el motivo/i), "Error de captura");
    await userEvent.setup().click(screen.getByRole("button", { name: /Confirmar cancelación/i }));
    expect(onConfirm).toHaveBeenCalledWith("Error de captura");
  });

  it("llama onConfirm con undefined si el motivo está vacío", async () => {
    const onConfirm = jest.fn();
    render(
      <CancelSaleModal
        sale={makeSale("completed")}
        isSaving={false}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />
    );
    await userEvent.setup().click(screen.getByRole("button", { name: /Confirmar cancelación/i }));
    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });

  it("deshabilita botones cuando isSaving=true", () => {
    render(
      <CancelSaleModal
        sale={makeSale("completed")}
        isSaving={true}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /Confirmar cancelación/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Cancelar/i })).toBeDisabled();
  });
});
