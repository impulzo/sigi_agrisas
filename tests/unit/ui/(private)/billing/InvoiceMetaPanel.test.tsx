/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { InvoiceMetaPanel } from "../../../../../app/(private)/billing/_blocks/InvoiceMetaPanel";
import type { Invoice } from "../../../../../app/(private)/billing/_logic/types/domain";

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv-1",
    uuid: "A1B2C3D4-0000-0000-0000-000000000001",
    facturamaCfdiId: "cfdi-1",
    status: "stamped",
    cfdiType: "I",
    cfdiUse: "G03",
    paymentForm: "01",
    paymentMethod: "PUE",
    receiverRfc: "XAXX010101000",
    receiverName: "Cliente de prueba",
    receiverCfdiUse: "G03",
    receiverFiscalRegime: "601",
    receiverTaxZipCode: "45010",
    issuerRfc: "AGR010101AB1",
    issuerLegalName: "Agrisas SA de CV",
    issuerFiscalRegime: "601",
    issuerZipCode: "83000",
    issuerAddress: "Calle Falsa 123, CDMX",
    currency: "MXN",
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    xmlUrl: null,
    pdfUrl: null,
    saleId: null,
    branchId: "branch-1",
    customerId: "customer-1",
    cancellationMotive: null,
    cancelledAt: null,
    createdAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z"),
    ...overrides,
  };
}

describe("InvoiceMetaPanel", () => {
  it("renders the issuer section with RFC, razón social, régimen fiscal and CP", () => {
    render(<InvoiceMetaPanel invoice={makeInvoice()} />);

    expect(screen.getByText("Datos del emisor")).toBeInTheDocument();
    expect(screen.getByText("AGR010101AB1")).toBeInTheDocument();
    expect(screen.getByText("Agrisas SA de CV")).toBeInTheDocument();
    expect(screen.getAllByText("601").length).toBe(2); // issuer + receiver share the same mock fiscalRegime
    expect(screen.getByText("83000")).toBeInTheDocument();
  });

  it("renders the receiver section with its own RFC, name, CFDI use and CP", () => {
    render(<InvoiceMetaPanel invoice={makeInvoice()} />);

    expect(screen.getByText("Datos del receptor")).toBeInTheDocument();
    expect(screen.getByText("XAXX010101000")).toBeInTheDocument();
    expect(screen.getByText("Cliente de prueba")).toBeInTheDocument();
    expect(screen.getByText("45010")).toBeInTheDocument();
  });

  it("shows dashes in the issuer section for a pre-migration invoice (null issuer snapshot)", () => {
    const invoice = makeInvoice({
      issuerRfc: null,
      issuerLegalName: null,
      issuerFiscalRegime: null,
      issuerZipCode: null,
      issuerAddress: null,
    });
    render(<InvoiceMetaPanel invoice={invoice} />);

    const emisorHeading = screen.getByText("Datos del emisor");
    const emisorSection = emisorHeading.parentElement!;
    expect(emisorSection.querySelectorAll("dd").length).toBe(5);
    emisorSection.querySelectorAll("dd").forEach((dd) => {
      expect(dd.textContent).toBe("—");
    });
  });

  it("shows resolved SAT descriptions when the DTO includes them, plus payment form/method descriptions", () => {
    const invoice = makeInvoice({
      issuerFiscalRegimeLabel: "601 - General de Ley Personas Morales",
      receiverFiscalRegimeLabel: "601 - General de Ley Personas Morales",
      receiverCfdiUseLabel: "G03 - Gastos en general",
    });
    render(<InvoiceMetaPanel invoice={invoice} />);

    expect(screen.getAllByText("601 - General de Ley Personas Morales").length).toBe(2);
    expect(screen.getAllByText("G03 - Gastos en general").length).toBe(2); // receptor + datos de pago CFDI
    expect(screen.getByText("01 - Efectivo")).toBeInTheDocument();
    expect(screen.getByText("PUE - Pago en una exhibición")).toBeInTheDocument();
  });

  it("falls back to the raw code when the DTO has no resolved labels (legacy response)", () => {
    const invoice = makeInvoice({
      issuerFiscalRegimeLabel: undefined,
      receiverFiscalRegimeLabel: undefined,
      receiverCfdiUseLabel: undefined,
    });
    render(<InvoiceMetaPanel invoice={invoice} />);

    expect(screen.getAllByText("601").length).toBe(2);
    expect(screen.getAllByText("G03").length).toBe(2);
  });

  it("shows the cancellation banner and hides nothing else when status is cancelled", () => {
    const invoice = makeInvoice({
      status: "cancelled",
      cancellationMotive: "02",
      cancelledAt: new Date("2026-08-02T12:00:00Z"),
    });
    render(<InvoiceMetaPanel invoice={invoice} />);

    expect(screen.getByText("Factura cancelada")).toBeInTheDocument();
    expect(screen.getByText(/02 - Comprobante emitido con errores sin relación/)).toBeInTheDocument();
    expect(screen.getByText("Datos del emisor")).toBeInTheDocument();
    expect(screen.getByText("Datos del receptor")).toBeInTheDocument();
  });
});
