/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../../../../app/(private)/billing/_logic/services/downloadInvoicePreviewPdf", () => ({
  downloadInvoicePreviewPdf: jest.fn(),
}));

jest.mock("../../../../../app/(private)/billing/_logic/services/resolveSatDescription", () => ({
  resolveFiscalRegimeDescription: jest.fn((code: string) => Promise.resolve(code)),
  resolveCfdiUseDescription: jest.fn((code: string) => Promise.resolve(code)),
  resolveSatProductCodeDescription: jest.fn((code: string) => Promise.resolve(code)),
}));

import { InvoicePreviewModal } from "../../../../../app/(private)/billing/_blocks/InvoicePreviewModal";
import { downloadInvoicePreviewPdf } from "../../../../../app/(private)/billing/_logic/services/downloadInvoicePreviewPdf";
import { resolveFiscalRegimeDescription, resolveCfdiUseDescription, resolveSatProductCodeDescription } from "../../../../../app/(private)/billing/_logic/services/resolveSatDescription";
import type { InvoicePreviewData } from "../../../../../app/(private)/billing/_logic/types/preview";

const mockDownload = downloadInvoicePreviewPdf as jest.MockedFunction<typeof downloadInvoicePreviewPdf>;
const mockResolveFiscalRegime = resolveFiscalRegimeDescription as jest.MockedFunction<typeof resolveFiscalRegimeDescription>;
const mockResolveCfdiUse = resolveCfdiUseDescription as jest.MockedFunction<typeof resolveCfdiUseDescription>;
const mockResolveSatProductCode = resolveSatProductCodeDescription as jest.MockedFunction<typeof resolveSatProductCodeDescription>;

HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});
HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
  this.removeAttribute("open");
});

function makeData(overrides: Partial<InvoicePreviewData> = {}): InvoicePreviewData {
  return {
    issuer: { name: "Agrisas", branchName: "Matriz", rfc: "AGR010101AB1", fiscalRegime: "601", zipCode: "83000", address: "Calle Falsa 123, CDMX" },
    receiver: { rfc: "XAXX010101000", name: "Cliente", cfdiUse: "G03", fiscalRegime: "601", taxZipCode: "45010" },
    lines: [
      { description: "Fertilizante", productCode: "SKU1", quantity: 1, unitPrice: 100, discountPct: 0, ivaRate: 0.16, iepsRate: 0, lineSubtotal: 86.21, lineTotal: 100 },
    ],
    paymentForm: "01",
    paymentMethod: "PUE",
    subtotal: 86.21,
    taxTotal: 13.79,
    total: 100,
    currency: "MXN",
    ...overrides,
  };
}

describe("InvoicePreviewModal", () => {
  beforeEach(() => jest.clearAllMocks());

  it("invokes downloadInvoicePreviewPdf with the preview data when clicking Descargar PDF", async () => {
    mockDownload.mockResolvedValueOnce(undefined);
    const data = makeData();
    render(
      <InvoicePreviewModal
        open={true}
        onClose={jest.fn()}
        data={data}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    await userEvent.setup().click(screen.getByRole("button", { name: /descargar pdf/i }));

    await waitFor(() => expect(mockDownload).toHaveBeenCalledWith(data));
  });

  it("renders discountPct at whole-percent scale (0-100), not multiplied again by 100", () => {
    const data = makeData({
      lines: [
        { description: "Fertilizante", productCode: "SKU1", quantity: 1, unitPrice: 100, discountPct: 10, ivaRate: 0.16, iepsRate: 0, lineSubtotal: 77.59, lineTotal: 90 },
      ],
    });
    render(
      <InvoicePreviewModal
        open={true}
        onClose={jest.fn()}
        data={data}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getByText("10%")).toBeInTheDocument();
    expect(screen.queryByText("1000%")).not.toBeInTheDocument();
    expect(screen.getByText("16%")).toBeInTheDocument();
  });

  it("disables Descargar PDF when there is no data (same guard as Timbrar ahora)", () => {
    render(
      <InvoicePreviewModal
        open={true}
        onClose={jest.fn()}
        data={null}
        isLoading={true}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getByRole("button", { name: /descargar pdf/i })).toBeDisabled();
  });

  it("shows a download error inline without closing the modal", async () => {
    mockDownload.mockRejectedValueOnce(new Error("No se pudo generar el PDF"));
    const onClose = jest.fn();
    render(
      <InvoicePreviewModal
        open={true}
        onClose={onClose}
        data={makeData()}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    await userEvent.setup().click(screen.getByRole("button", { name: /descargar pdf/i }));

    expect(await screen.findByText("No se pudo generar el PDF")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows the draft badge, pending folio and logo when data is present", () => {
    render(
      <InvoicePreviewModal
        open={true}
        onClose={jest.fn()}
        data={makeData()}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getByText(/borrador/i)).toBeInTheDocument();
    expect(screen.getByText(/pendiente de timbrar/i)).toBeInTheDocument();
    expect(screen.getByAltText("Agrisas")).toBeInTheDocument();
    expect(screen.getByText("Fertilizante")).toBeInTheDocument();
  });

  it("invokes onConfirmStamp when clicking Timbrar ahora", async () => {
    const onConfirmStamp = jest.fn();
    render(
      <InvoicePreviewModal
        open={true}
        onClose={jest.fn()}
        data={makeData()}
        onConfirmStamp={onConfirmStamp}
        isSubmitting={false}
      />
    );

    await userEvent.setup().click(screen.getByRole("button", { name: /timbrar ahora/i }));
    expect(onConfirmStamp).toHaveBeenCalledTimes(1);
  });

  it("invokes onClose when clicking Volver a editar", async () => {
    const onClose = jest.fn();
    render(
      <InvoicePreviewModal
        open={true}
        onClose={onClose}
        data={makeData()}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    await userEvent.setup().click(screen.getByRole("button", { name: /volver a editar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows loading state and disables Timbrar ahora while resolving data", () => {
    render(
      <InvoicePreviewModal
        open={true}
        onClose={jest.fn()}
        data={null}
        isLoading={true}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getByRole("button", { name: /timbrar ahora/i })).toBeDisabled();
  });

  it("renders the issuer section with RFC, razón social, régimen fiscal and CP", () => {
    render(
      <InvoicePreviewModal
        open={true}
        onClose={jest.fn()}
        data={makeData()}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getByText("Datos del emisor")).toBeInTheDocument();
    expect(screen.getByText("AGR010101AB1")).toBeInTheDocument();
    expect(screen.getAllByText("601").length).toBe(2); // issuer + receiver share the same mock fiscalRegime
    expect(screen.getByText("83000")).toBeInTheDocument();
  });

  it("renders dashes in the issuer section when the fiscal lookup is unresolved", () => {
    const data = makeData({ issuer: { name: "Agrisas" } });
    render(
      <InvoicePreviewModal
        open={true}
        onClose={jest.fn()}
        data={data}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    const emisorHeading = screen.getByText("Datos del emisor");
    const emisorSection = emisorHeading.closest("div")!.parentElement!;
    expect(emisorSection.textContent).toContain("—");
  });

  it("shows 'Factura' as the header title instead of the company name, plus the issuer's address", () => {
    render(
      <InvoicePreviewModal
        open={true}
        onClose={jest.fn()}
        data={makeData()}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getByText("Factura")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Agrisas" })).not.toBeInTheDocument();
    expect(screen.getByText("Dirección")).toBeInTheDocument();
    expect(screen.getByText("Calle Falsa 123, CDMX")).toBeInTheDocument();
  });

  it("resolves and shows the fiscal regime / CFDI use descriptions once available", async () => {
    mockResolveFiscalRegime.mockImplementation((code) =>
      Promise.resolve(code === "601" ? "601 - General de Ley Personas Morales" : code)
    );
    mockResolveCfdiUse.mockResolvedValue("G03 - Gastos en general");

    render(
      <InvoicePreviewModal
        open={true}
        onClose={jest.fn()}
        data={makeData()}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    expect(await screen.findByText("G03 - Gastos en general")).toBeInTheDocument();
    expect(screen.getAllByText("601 - General de Ley Personas Morales").length).toBe(2);
  });

  it("renders the receiver's zip code alongside the rest of its fiscal data", () => {
    render(
      <InvoicePreviewModal
        open={true}
        onClose={jest.fn()}
        data={makeData()}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getAllByText("Código postal").length).toBeGreaterThan(0);
    expect(screen.getByText("45010")).toBeInTheDocument();
  });

  it("shows load error and disables Timbrar ahora", () => {
    render(
      <InvoicePreviewModal
        open={true}
        onClose={jest.fn()}
        data={null}
        loadError={new Error("Esta venta no tiene cliente asociado, no se puede facturar")}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getByText(/esta venta no tiene cliente asociado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /timbrar ahora/i })).toBeDisabled();
  });

  it("renders Forma de pago and Metodo de pago section with descriptions", () => {
    render(
      <InvoicePreviewModal
        open={true}
        onClose={jest.fn()}
        data={makeData()}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getByText("Datos de pago CFDI")).toBeInTheDocument();
    expect(screen.getByText("Forma de pago")).toBeInTheDocument();
    expect(screen.getByText("Método de pago")).toBeInTheDocument();
  });

  it("resolves and shows SAT product code description per line when satProductCode is present", async () => {
    mockResolveSatProductCode.mockImplementation((code: string) =>
      Promise.resolve(code === "21102300" ? "21102300 - Fertilizantes" : code)
    );

    const data = makeData({
      lines: [
        { description: "Fertilizante", productCode: "SKU1", satProductCode: "21102300", quantity: 2, unitPrice: 50, discountPct: 0, ivaRate: 0.16, iepsRate: 0, lineSubtotal: 86.21, lineTotal: 100 },
      ],
    });

    render(
      <InvoicePreviewModal
        open={true}
        onClose={jest.fn()}
        data={data}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    expect(await screen.findByText("SAT: 21102300 - Fertilizantes")).toBeInTheDocument();
    expect(mockResolveSatProductCode).toHaveBeenCalledWith("21102300");
  });

  it("renders IEPS percentage per line when iepsRate > 0", () => {
    const data = makeData({
      lines: [
        { description: "Producto con IEPS", productCode: "SKU2", quantity: 1, unitPrice: 200, discountPct: 0, ivaRate: 0.16, iepsRate: 0.08, lineSubtotal: 185.19, lineTotal: 200 },
      ],
    });

    render(
      <InvoicePreviewModal
        open={true}
        onClose={jest.fn()}
        data={data}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getByText("8%")).toBeInTheDocument();
  });

  it("renders subtotal per line", () => {
    const data = makeData({
      lines: [
        { description: "Fertilizante", productCode: "SKU1", quantity: 1, unitPrice: 100, discountPct: 0, ivaRate: 0.16, iepsRate: 0, lineSubtotal: 86.21, lineTotal: 100 },
      ],
    });

    render(
      <InvoicePreviewModal
        open={true}
        onClose={jest.fn()}
        data={data}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getAllByText("Subtotal").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the issuer branch name as a subtitle when provided", () => {
    render(
      <InvoicePreviewModal
        open={true}
        onClose={jest.fn()}
        data={makeData({ issuer: { name: "Agrisas", branchName: "Sucursal Centro", rfc: "AGR010101AB1", fiscalRegime: "601", zipCode: "83000", address: "Calle Falsa 123" } })}
        onConfirmStamp={jest.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getByText("Sucursal Centro")).toBeInTheDocument();
  });
});
