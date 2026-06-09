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

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: mockPush })),
}));

// 9 levels up: _blocks/ new/ returns/ [id]/ sales/ (private)/ ui/ unit/ tests/ → repo root
jest.mock("../../../../../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../../../../../app/(private)/sales/_logic/hooks/useSaleDetail");
jest.mock("../../../../../../../../../app/(private)/returns/_logic/hooks/useCreateReturnForm");

jest.mock("../../../../../../../../../app/(private)/sales/_blocks/SaleItemsTable", () => ({
  SaleItemsTable: () => <div data-testid="sale-items-table" />,
}));
jest.mock("../../../../../../../../../app/(private)/sales/[id]/returns/new/_blocks/CreateReturnFooter", () => ({
  CreateReturnFooter: ({ onSubmit, validationError }: { onSubmit: () => void; validationError: string | null }) => (
    <div>
      {validationError && <p data-testid="validation-error">{validationError}</p>}
      <button type="button" onClick={onSubmit}>Registrar devolución</button>
    </div>
  ),
}));

import { useCurrentUser } from "../../../../../../../../../app/_hooks/useCurrentUser";
import * as useSaleDetailModule from "../../../../../../../../../app/(private)/sales/_logic/hooks/useSaleDetail";
import * as useCreateReturnFormModule from "../../../../../../../../../app/(private)/returns/_logic/hooks/useCreateReturnForm";
import { CreateReturnPage } from "../../../../../../../../../app/(private)/sales/[id]/returns/new/_blocks/CreateReturnPage";
import type { SaleDetail } from "../../../../../../../../../app/(private)/sales/_logic/types/domain";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

function setupCurrentUser(can: (p: string) => boolean | "loading") {
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "test@test.com",
    roles: [],
    branchId: null,
    isLoading: false,
    can,
    refresh: jest.fn(),
  });
}

const NOW = new Date("2026-06-01T10:00:00Z");

function makeSale(status: "completed" | "cancelled" | "edited" = "completed"): SaleDetail {
  return {
    id: "sale-1",
    branchId: "b1",
    cashierId: "u1",
    cashierName: "Cajero",
    folioId: "f1",
    folioNumber: 42,
    folioPrefix: "A",
    paymentMethodId: "pm1",
    paymentMethodName: "Efectivo",
    status,
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    paidAmount: 116,
    paymentStatus: "paid",
    isCredit: false,
    customerName: "Cliente",
    branchName: "Sucursal",
    items: [],
    notes: null,
    cancellationReason: null,
    cancelledAt: null,
    editedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    returnedQuantityBySaleItem: {},
  };
}

function setupSaleDetail(sale: SaleDetail | null, isLoading = false) {
  jest.spyOn(useSaleDetailModule, "useSaleDetail").mockReturnValue({
    sale,
    isLoading,
    error: null,
    refresh: jest.fn(),
  });
}

function setupForm(validationError: string | null = "Selecciona al menos un producto") {
  jest.spyOn(useCreateReturnFormModule, "useCreateReturnForm").mockReturnValue({
    lines: [],
    reason: "",
    returnedAt: "2026-06-01",
    notes: "",
    isSubmitting: false,
    validationError,
    setReason: jest.fn(),
    setReturnedAt: jest.fn(),
    setNotes: jest.fn(),
    updateLine: jest.fn(),
    submit: jest.fn().mockResolvedValue(null),
  });
}

describe("CreateReturnPage — gates", () => {
  beforeEach(() => { jest.clearAllMocks(); mockPush.mockClear(); });

  it("sin returns:create → EmptyState 'Sin acceso'", () => {
    setupCurrentUser(() => false);
    setupSaleDetail(makeSale());
    setupForm();
    render(<CreateReturnPage saleId="sale-1" />);
    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
  });

  it("sale.status !== 'completed' → EmptyState 'Esta venta no acepta devoluciones'", () => {
    setupCurrentUser(() => true);
    setupSaleDetail(makeSale("cancelled"));
    setupForm();
    render(<CreateReturnPage saleId="sale-1" />);
    expect(screen.getByText("Esta venta no acepta devoluciones")).toBeInTheDocument();
  });

  it("sale=null → EmptyState 'Venta no encontrada'", () => {
    setupCurrentUser(() => true);
    setupSaleDetail(null);
    setupForm();
    render(<CreateReturnPage saleId="sale-1" />);
    expect(screen.getByText("Venta no encontrada")).toBeInTheDocument();
  });
});

describe("CreateReturnPage — happy path", () => {
  beforeEach(() => { jest.clearAllMocks(); mockPush.mockClear(); });

  it("muestra encabezado con folio cuando sale está cargada", () => {
    setupCurrentUser(() => true);
    setupSaleDetail(makeSale());
    setupForm(null);
    render(<CreateReturnPage saleId="sale-1" />);
    expect(screen.getByText(/Registrar devolución — Folio A-42/i)).toBeInTheDocument();
  });

  it("renderiza SaleItemsTable", () => {
    setupCurrentUser(() => true);
    setupSaleDetail(makeSale());
    setupForm(null);
    render(<CreateReturnPage saleId="sale-1" />);
    expect(screen.getByTestId("sale-items-table")).toBeInTheDocument();
  });

  it("botón de submit llama form.submit()", async () => {
    const submitMock = jest.fn().mockResolvedValue(null);
    setupCurrentUser(() => true);
    setupSaleDetail(makeSale());
    jest.spyOn(useCreateReturnFormModule, "useCreateReturnForm").mockReturnValue({
      lines: [],
      reason: "motivo",
      returnedAt: "2026-06-01",
      notes: "",
      isSubmitting: false,
      validationError: null,
      setReason: jest.fn(),
      setReturnedAt: jest.fn(),
      setNotes: jest.fn(),
      updateLine: jest.fn(),
      submit: submitMock,
    });
    render(<CreateReturnPage saleId="sale-1" />);
    const btn = screen.getByRole("button", { name: /Registrar devolución/i });
    await btn.click();
    expect(submitMock).toHaveBeenCalled();
  });
});
