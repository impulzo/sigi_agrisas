/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("../../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../../app/(private)/payments/_logic/hooks/useSalePayments");
jest.mock("../../../../../../app/(private)/payments/_blocks/RegisterPaymentModal", () => ({
  RegisterPaymentModal: () => null,
}));
jest.mock("../../../../../../app/(private)/payments/_blocks/CancelPaymentModal", () => ({
  CancelPaymentModal: () => null,
}));

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import { useSalePayments } from "../../../../../../app/(private)/payments/_logic/hooks/useSalePayments";
import { SalePaymentsSection } from "../../../../../../app/(private)/sales/_blocks/SalePaymentsSection";
import type { SaleDetail } from "../../../../../../app/(private)/sales/_logic/types/domain";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUseSalePayments = useSalePayments as jest.MockedFunction<typeof useSalePayments>;

function makeSale(status: "completed" | "cancelled" | "edited" = "completed", isCredit = true): SaleDetail {
  return {
    id: "s1",
    branchId: "b1",
    cashierId: "u1",
    cashierName: "Cajero",
    folioId: "f1",
    folioNumber: 1,
    folioPrefix: "A",
    paymentMethodId: "pm1",
    paymentMethodName: "Crédito",
    status,
    subtotal: 1000,
    taxTotal: 160,
    total: 1000,
    paidAmount: 300,
    paymentStatus: "partial",
    isCredit,
    customerName: "Cliente",
    branchName: "Central",
    items: [],
    notes: null,
    cancellationReason: null,
    cancelledAt: null,
    editedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    returnedQuantityBySaleItem: {},
  };
}

function setup(canCreate = true) {
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "test@test.com",
    roles: [],
    branchId: "b1",
    isLoading: false,
    can: jest.fn((p: string) => {
      if (p === "payments:create") return canCreate;
      return false;
    }),
    refresh: jest.fn(),
  });
  mockUseSalePayments.mockReturnValue({
    payments: [],
    paidAmount: 300,
    total: 1000,
    paymentStatus: "partial",
    lineBalances: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  });
}

describe("SalePaymentsSection", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra título 'Abonos'", () => {
    setup();
    render(<SalePaymentsSection saleId="s1" sale={makeSale()} onPaymentMutated={jest.fn()} />);
    expect(screen.getByText("Abonos")).toBeInTheDocument();
  });

  it("muestra barra de progreso con porcentaje correcto", () => {
    setup();
    render(<SalePaymentsSection saleId="s1" sale={makeSale()} onPaymentMutated={jest.fn()} />);
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("muestra CTA '+ Registrar abono' cuando status=completed y can=true", () => {
    setup(true);
    render(<SalePaymentsSection saleId="s1" sale={makeSale("completed")} onPaymentMutated={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Registrar abono/i })).toBeInTheDocument();
  });

  it("oculta CTA cuando status=cancelled", () => {
    setup(true);
    render(<SalePaymentsSection saleId="s1" sale={makeSale("cancelled")} onPaymentMutated={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /Registrar abono/i })).not.toBeInTheDocument();
  });

  it("oculta CTA cuando sin payments:create", () => {
    setup(false);
    render(<SalePaymentsSection saleId="s1" sale={makeSale("completed")} onPaymentMutated={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /Registrar abono/i })).not.toBeInTheDocument();
  });

  it("muestra 'Sin abonos registrados' cuando no hay pagos", () => {
    setup();
    render(<SalePaymentsSection saleId="s1" sale={makeSale()} onPaymentMutated={jest.fn()} />);
    expect(screen.getByText("Sin abonos registrados.")).toBeInTheDocument();
  });

  it("muestra la tabla 'Saldo por producto' derivada de lineBalances, incluso sin abonos", () => {
    setup();
    mockUseSalePayments.mockReturnValue({
      payments: [],
      paidAmount: 0,
      total: 1000,
      paymentStatus: "pending",
      lineBalances: [
        { saleItemId: "line-a", productNameSnapshot: "Producto A", lineTotal: 600, paidAmount: 0, dueAmount: 600 },
        { saleItemId: "line-b", productNameSnapshot: "Producto B", lineTotal: 400, paidAmount: 0, dueAmount: 400 },
      ],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<SalePaymentsSection saleId="s1" sale={makeSale()} onPaymentMutated={jest.fn()} />);
    expect(screen.getByText("Saldo por producto")).toBeInTheDocument();
    expect(screen.getByText("Producto A")).toBeInTheDocument();
    expect(screen.getByText("Producto B")).toBeInTheDocument();
  });

  function makePayment(status: "completed" | "cancelled" = "completed") {
    return {
      id: "pay-1",
      saleId: "s1",
      userId: "u1",
      userName: "Cobrador",
      branchId: "b1",
      paymentMethodId: "pm1",
      paymentMethodName: "Efectivo",
      folioId: "f1",
      folioNumber: 1,
      folioPrefix: "RECIBO-",
      amount: 300,
      status,
      createdAt: new Date("2026-06-01T10:00:00Z"),
      updatedAt: new Date("2026-06-01T10:00:00Z"),
      saleTotal: 1000,
      salePaidAmount: 300,
      salePaymentStatus: "partial" as const,
      saleDueAmount: 700,
    };
  }

  it("muestra badge 'Activo' cuando la venta sigue parcial (Historia #3)", () => {
    setup();
    mockUseSalePayments.mockReturnValue({
      payments: [makePayment("completed")],
      paidAmount: 300,
      total: 1000,
      paymentStatus: "partial",
      lineBalances: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<SalePaymentsSection saleId="s1" sale={makeSale()} onPaymentMutated={jest.fn()} />);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("muestra badge 'Completado' solo cuando la venta llega a 100% (Historia #3)", () => {
    setup();
    mockUseSalePayments.mockReturnValue({
      payments: [makePayment("completed")],
      paidAmount: 1000,
      total: 1000,
      paymentStatus: "paid",
      lineBalances: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<SalePaymentsSection saleId="s1" sale={makeSale()} onPaymentMutated={jest.fn()} />);
    expect(screen.getByText("Completado")).toBeInTheDocument();
  });
});
