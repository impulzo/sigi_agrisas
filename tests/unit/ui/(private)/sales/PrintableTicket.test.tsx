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
  customerRfc: "XAXX010101000",
  customerAddress: "Av. Central 123, Oaxaca",
  customerCreditDays: 30,
  cashierId: "u1",
  cashierName: "Admin",
  folioId: "f1",
  folioCode: "TK-42",
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

const defaultSettings: TicketSettingsDto = {
  logoUrl: null,
  headerText: null,
  footerText: null,
  paperWidth: "80mm",
  businessAddress: null,
  businessPhone: null,
  businessTaxRegime: null,
  legendText: null,
};

describe("PrintableTicket", () => {
  it("falls back to the embedded Agrisas logo when logoUrl is null", () => {
    const settings: TicketSettingsDto = { ...defaultSettings, headerText: "Encabezado", footerText: "Pie" };
    render(<PrintableTicket sale={sale} ticketSettings={settings} />);

    expect(screen.getByAltText("Logo")).toHaveAttribute("src", "/logo.png");
    expect(screen.getByText("Encabezado")).toBeInTheDocument();
  });

  it("renders the logo when logoUrl is present", () => {
    const settings: TicketSettingsDto = { ...defaultSettings, logoUrl: "https://x.test/logo.png" };
    render(<PrintableTicket sale={sale} ticketSettings={settings} />);

    expect(screen.getByAltText("Logo")).toBeInTheDocument();
  });

  it("sizes the logo to 75x105px in the print layout", () => {
    const { container } = render(<PrintableTicket sale={sale} ticketSettings={null} />);

    const printStyle = container.querySelector("style")?.textContent ?? "";
    expect(printStyle).toContain(".printable-ticket img");
    expect(printStyle).toContain("width: 75px; height: 105px;");
    expect(printStyle).toContain("object-fit: contain");
  });

  it("reduces the logo bottom margin 40% to 2.4px", () => {
    const { container } = render(<PrintableTicket sale={sale} ticketSettings={null} />);

    const printStyle = container.querySelector("style")?.textContent ?? "";
    expect(printStyle).toContain("margin: 0 auto 2.4px;");
  });

  it("renders sale data correctly regardless of paperWidth", () => {
    const settings: TicketSettingsDto = { ...defaultSettings, paperWidth: "58mm" };
    render(<PrintableTicket sale={sale} ticketSettings={settings} />);

    expect(screen.getByText(/folio: tk-42/i)).toBeInTheDocument();
    expect(screen.getByText("PACKHARD 1 L")).toBeInTheDocument();
  });

  it("does not crash and falls back to 80mm and embedded logo when ticketSettings is null", () => {
    render(<PrintableTicket sale={sale} ticketSettings={null} />);

    expect(screen.getByText(/folio: tk-42/i)).toBeInTheDocument();
    expect(screen.getByAltText("Logo")).toHaveAttribute("src", "/logo.png");
  });

  it("shows IVA and IEPS as separate lines, always visible even when IEPS is $0", () => {
    render(<PrintableTicket sale={sale} ticketSettings={null} />);

    expect(screen.getByText("IVA")).toBeInTheDocument();
    expect(screen.getByText("IEPS")).toBeInTheDocument();
    expect(screen.queryByText("Impuestos")).not.toBeInTheDocument();
  });

  it("renders the payment method aligned to the Stitch design", () => {
    render(<PrintableTicket sale={sale} ticketSettings={null} />);

    expect(screen.getByText("Pago")).toBeInTheDocument();
    expect(screen.getByText("Efectivo")).toBeInTheDocument();
  });

  it("renders the folio at the bottom as a decorative barcode-style element", () => {
    const { container } = render(<PrintableTicket sale={sale} ticketSettings={null} />);

    const barcode = container.querySelector("[aria-hidden='true']");
    expect(barcode).not.toBeNull();
    expect(screen.getByText("TK-42")).toBeInTheDocument();
  });

  it("labels the seller as Vendedor instead of Cajero", () => {
    render(<PrintableTicket sale={sale} ticketSettings={null} />);

    expect(screen.getByText(/vendedor: admin/i)).toBeInTheDocument();
    expect(screen.queryByText(/cajero:/i)).not.toBeInTheDocument();
  });

  it("renders customer info: RFC, name and address", () => {
    render(<PrintableTicket sale={sale} ticketSettings={null} />);

    expect(screen.getByText("Cliente")).toBeInTheDocument();
    expect(screen.getByText(/RFC: XAXX010101000/i)).toBeInTheDocument();
    expect(screen.getByText(/Nombre: Cliente Uno/i)).toBeInTheDocument();
    expect(screen.getByText(/Dirección: Av. Central 123, Oaxaca/i)).toBeInTheDocument();
  });

  it("shows credit conditions from customer creditDays", () => {
    render(<PrintableTicket sale={sale} ticketSettings={null} />);

    expect(screen.getByText("Condiciones")).toBeInTheDocument();
    expect(screen.getByText("Crédito a 30 días")).toBeInTheDocument();
  });

  it("omits customer section and credit conditions when sale has no customer", () => {
    const saleNoCustomer: SaleDetail = { ...sale, customerId: null, customerName: null, customerRfc: null, customerAddress: null, customerCreditDays: null };
    render(<PrintableTicket sale={saleNoCustomer} ticketSettings={null} />);

    expect(screen.queryByText("Cliente")).not.toBeInTheDocument();
    expect(screen.queryByText("Condiciones")).not.toBeInTheDocument();
  });

  it("shows 'Total a pagar' label", () => {
    render(<PrintableTicket sale={sale} ticketSettings={null} />);

    expect(screen.getByText("Total a pagar")).toBeInTheDocument();
  });

  it("renders business info from ticket settings", () => {
    const settings: TicketSettingsDto = {
      ...defaultSettings,
      businessAddress: "Ocotlan de Morelos, Oaxaca. CP 71520",
      businessPhone: "951 292 80 86",
      businessTaxRegime: "612 Personas Físicas con Actividad Empresarial",
    };
    render(<PrintableTicket sale={sale} ticketSettings={settings} />);

    expect(screen.getByText("Ocotlan de Morelos, Oaxaca. CP 71520")).toBeInTheDocument();
    expect(screen.getByText("Tel. 951 292 80 86")).toBeInTheDocument();
    expect(screen.getByText("612 Personas Físicas con Actividad Empresarial")).toBeInTheDocument();
  });

  it("renders the legend text when set", () => {
    const settings: TicketSettingsDto = {
      ...defaultSettings,
      legendText: "Favor de revisar su mercancía. No se hacen cambios ni devoluciones. Gracias por su compra.",
    };
    render(<PrintableTicket sale={sale} ticketSettings={settings} />);

    expect(screen.getByText(/Favor de revisar su mercancía/)).toBeInTheDocument();
  });

  it("does not render legend when null", () => {
    render(<PrintableTicket sale={sale} ticketSettings={null} />);

    expect(screen.queryByText(/Favor de revisar su mercancía/)).not.toBeInTheDocument();
  });
});
