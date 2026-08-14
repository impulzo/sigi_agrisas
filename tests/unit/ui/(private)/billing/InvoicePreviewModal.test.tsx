/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { InvoicePreviewModal } from "../../../../../app/(private)/billing/_blocks/InvoicePreviewModal";
import type { InvoicePreviewData } from "../../../../../app/(private)/billing/_logic/types/preview";

HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});
HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
  this.removeAttribute("open");
});

function makeData(overrides: Partial<InvoicePreviewData> = {}): InvoicePreviewData {
  return {
    issuer: { name: "Agrisas", branchName: "Matriz" },
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
});
