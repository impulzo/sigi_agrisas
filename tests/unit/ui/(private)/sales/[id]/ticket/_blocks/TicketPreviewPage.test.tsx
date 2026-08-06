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
jest.mock("../../../../../../../../app/(private)/sales/_logic/hooks/useSaleDetail");
jest.mock("../../../../../../../../app/(private)/settings/_logic/services/getTicketSettings", () => ({
  getTicketSettings: jest.fn().mockResolvedValue({ logoUrl: null, headerText: null, footerText: null, paperWidth: "80mm" }),
}));

import { useSaleDetail } from "../../../../../../../../app/(private)/sales/_logic/hooks/useSaleDetail";
import { TicketPreviewPage } from "../../../../../../../../app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage";
import type { SaleDetail } from "../../../../../../../../app/(private)/sales/_logic/types/domain";

const mockUseSaleDetail = useSaleDetail as jest.MockedFunction<typeof useSaleDetail>;

function makeSale(overrides: Partial<SaleDetail> = {}): SaleDetail {
  return {
    id: "sale-1",
    branchId: "branch-1",
    cashierId: "user-1",
    cashierName: "Cajero Test",
    folioId: "folio-1",
    folioNumber: 42,
    folioPrefix: "A",
    paymentMethodId: "pm-1",
    paymentMethodName: "Efectivo",
    status: "completed",
    subtotal: 86.2069,
    taxTotal: 13.7931,
    total: 100,
    paidAmount: 100,
    paymentStatus: "paid",
    isCredit: false,
    customerName: "Cliente Test",
    branchName: "Sucursal Norte",
    items: [
      {
        id: "item-1",
        productId: "product-1",
        productCodeSnapshot: "SKU-1",
        productNameSnapshot: "Producto 1",
        productPriceId: "price-1",
        priceNameSnapshot: "Default",
        quantity: 1,
        unitPrice: 100,
        discountPct: 0,
        ivaRate: 0.16,
        iepsRate: 0,
        lineSubtotal: 86.2069,
        lineIva: 13.7931,
        lineIeps: 0,
        lineTotal: 100,
      },
    ],
    notes: null,
    cancellationReason: null,
    cancelledAt: null,
    editedAt: null,
    createdAt: new Date("2026-05-30T10:00:00Z"),
    updatedAt: new Date("2026-05-30T10:00:00Z"),
    returnedQuantityBySaleItem: {},
    ...overrides,
  };
}

describe("TicketPreviewPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra IVA e IEPS siempre visibles, aunque IEPS sea $0", () => {
    mockUseSaleDetail.mockReturnValue({ sale: makeSale(), isLoading: false, error: null, refresh: jest.fn() });
    render(<TicketPreviewPage id="sale-1" />);

    // "IVA"/"IEPS" aparecen tanto en la vista Stitch como en el PrintableTicket
    // (montado oculto, hidden print:block) que también las muestra siempre.
    expect(screen.getAllByText("IVA").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("IEPS").length).toBeGreaterThanOrEqual(1);
  });

  it("muestra los botones Imprimir Ticket y Enviar por Correo", () => {
    mockUseSaleDetail.mockReturnValue({ sale: makeSale(), isLoading: false, error: null, refresh: jest.fn() });
    render(<TicketPreviewPage id="sale-1" />);

    expect(screen.getByRole("button", { name: /imprimir ticket/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar por correo/i })).toBeInTheDocument();
  });

  it("muestra un estado vacío cuando la venta no existe", () => {
    mockUseSaleDetail.mockReturnValue({ sale: null, isLoading: false, error: new Error("not found"), refresh: jest.fn() });
    render(<TicketPreviewPage id="sale-1" />);

    expect(screen.getByText(/no se encontró la venta/i)).toBeInTheDocument();
  });
});
