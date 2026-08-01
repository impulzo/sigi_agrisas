/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { PrintableTicket } from "../../../../../app/(private)/sales/_blocks/PrintableTicket";
import type { SaleDetail } from "../../../../../app/(private)/sales/_logic/types/domain";
import type { TicketSettingsDto } from "../../../../../app/(private)/settings/_logic/types/api";

const sale: SaleDetail = {
  id: "sale-1",
  branchId: "b1",
  branchName: "Matriz",
  customerId: "c1",
  customerName: "Cliente Uno",
  cashierId: "u1",
  cashierName: "Admin",
  folioId: "f1",
  folioNumber: 42,
  folioPrefix: "TK",
  paymentMethodId: "pm1",
  paymentMethodName: "Efectivo",
  status: "completed",
  subtotal: 100,
  taxTotal: 16,
  total: 116,
  paidAmount: 116,
  paymentStatus: "paid",
  isCredit: false,
  createdAt: new Date("2026-08-02T10:00:00Z"),
  updatedAt: new Date("2026-08-02T10:00:00Z"),
  items: [
    {
      id: "item-1",
      productId: "p1",
      productCodeSnapshot: "PK1",
      productNameSnapshot: "PACKHARD 1 L",
      productPriceId: "price-1",
      priceNameSnapshot: "Precio Publico",
      quantity: 1,
      unitPrice: 100,
      discountPct: 0,
      ivaRate: 0.16,
      iepsRate: 0,
      lineSubtotal: 100,
      lineIva: 16,
      lineIeps: 0,
      lineTotal: 116,
    },
  ],
  returnedQuantityBySaleItem: {},
};

describe("PrintableTicket", () => {
  it("omits the logo section when logoUrl is null", () => {
    const settings: TicketSettingsDto = { logoUrl: null, headerText: "Encabezado", footerText: "Pie", paperWidth: "80mm" };
    render(<PrintableTicket sale={sale} ticketSettings={settings} />);

    expect(screen.queryByAltText("Logo")).not.toBeInTheDocument();
    expect(screen.getByText("Encabezado")).toBeInTheDocument();
  });

  it("renders the logo when logoUrl is present", () => {
    const settings: TicketSettingsDto = { logoUrl: "https://x.test/logo.png", headerText: null, footerText: null, paperWidth: "80mm" };
    render(<PrintableTicket sale={sale} ticketSettings={settings} />);

    expect(screen.getByAltText("Logo")).toBeInTheDocument();
  });

  it("renders sale data correctly regardless of paperWidth", () => {
    const settings: TicketSettingsDto = { logoUrl: null, headerText: null, footerText: null, paperWidth: "58mm" };
    render(<PrintableTicket sale={sale} ticketSettings={settings} />);

    expect(screen.getByText(/folio: tk-42/i)).toBeInTheDocument();
    expect(screen.getByText("PACKHARD 1 L")).toBeInTheDocument();
  });

  it("does not crash and falls back to 80mm when ticketSettings is null", () => {
    render(<PrintableTicket sale={sale} ticketSettings={null} />);

    expect(screen.getByText(/folio: tk-42/i)).toBeInTheDocument();
    expect(screen.queryByAltText("Logo")).not.toBeInTheDocument();
  });
});
