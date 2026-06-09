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
});
