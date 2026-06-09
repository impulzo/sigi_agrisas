/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => {
  const Link = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

jest.mock("../../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../../app/(private)/payments/_logic/hooks/usePaymentDetail");
jest.mock("../../../../../../app/(private)/payments/_logic/hooks/usePaymentMutations", () => ({
  usePaymentMutations: () => ({ isSaving: false, cancel: jest.fn(), mutationError: null, clearError: jest.fn() }),
}));

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import { usePaymentDetail } from "../../../../../../app/(private)/payments/_logic/hooks/usePaymentDetail";
import { PaymentDetailPage } from "../../../../../../app/(private)/payments/_blocks/PaymentDetailPage";
import type { PaymentDetail } from "../../../../../../app/(private)/payments/_logic/types/domain";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUsePaymentDetail = usePaymentDetail as jest.MockedFunction<typeof usePaymentDetail>;

const VALID_ID = "550e8400-e29b-41d4-a716-446655440000";

function makePayment(status: "completed" | "cancelled" = "completed"): PaymentDetail {
  return {
    id: VALID_ID,
    saleId: "s1",
    saleFolioCode: "A-42",
    customerId: "c1",
    customerName: "Cliente Test",
    userId: "u1",
    userName: "Cobrador Test",
    branchId: "b1",
    branchName: "Sucursal Central",
    paymentMethodId: "pm1",
    paymentMethodName: "Efectivo",
    folioId: "f1",
    folioCode: "RECIBO",
    folioNumber: 1,
    folioPrefix: "RECIBO-",
    amount: 300,
    status,
    notes: null,
    createdAt: new Date("2026-06-01T10:00:00Z"),
    updatedAt: new Date("2026-06-01T10:00:00Z"),
    cancelledAt: status === "cancelled" ? new Date("2026-06-02T10:00:00Z") : null,
    cancellationReason: status === "cancelled" ? "Error de captura" : null,
  };
}

function setup(can: (p: string) => boolean | "loading", payment = makePayment()) {
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "test@test.com",
    roles: [],
    branchId: "b1",
    isLoading: false,
    can: jest.fn(can),
    refresh: jest.fn(),
  });
  mockUsePaymentDetail.mockReturnValue({
    payment,
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  });
}

describe("PaymentDetailPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra botón 'Cancelar abono' cuando completed + payments:cancel", () => {
    setup((p) => p === "payments:cancel");
    render(<PaymentDetailPage id={VALID_ID} />);
    expect(screen.getByRole("button", { name: /Cancelar abono/i })).toBeInTheDocument();
  });

  it("oculta botón 'Cancelar abono' cuando status=cancelled", () => {
    setup((p) => p === "payments:cancel", makePayment("cancelled"));
    render(<PaymentDetailPage id={VALID_ID} />);
    expect(screen.queryByRole("button", { name: /Cancelar abono/i })).not.toBeInTheDocument();
  });

  it("oculta botón 'Cancelar abono' sin payments:cancel", () => {
    setup(() => false);
    render(<PaymentDetailPage id={VALID_ID} />);
    expect(screen.queryByRole("button", { name: /Cancelar abono/i })).not.toBeInTheDocument();
  });

  it("muestra el link al ticket origen", () => {
    setup(() => false);
    render(<PaymentDetailPage id={VALID_ID} />);
    expect(screen.getByRole("link", { name: /A-42/i })).toHaveAttribute("href", "/sales/s1");
  });

  it("muestra ID inválido para UUID malformado", () => {
    mockUseCurrentUser.mockReturnValue({
      userId: "u1", email: "test@test.com", roles: [], branchId: null,
      isLoading: false, can: jest.fn(() => false), refresh: jest.fn(),
    });
    render(<PaymentDetailPage id="not-a-uuid" />);
    expect(screen.getByText("ID inválido")).toBeInTheDocument();
  });
});
