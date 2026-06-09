/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));
jest.mock("../../../../../../app/_components/atoms/Spinner/Spinner", () => ({
  Spinner: () => <span data-testid="spinner" />,
}));
jest.mock("../../../../../../app/_hooks/useFoliosOptions", () => ({
  useFoliosOptions: () => ({
    options: [{ id: "f2", name: "Factura", prefix: "FAC", currentNumber: 0 }],
    isLoading: false,
  }),
}));
jest.mock("../../../../../../app/_hooks/usePaymentMethodsOptions", () => ({
  usePaymentMethodsOptions: () => ({
    options: [{ id: "pm1", name: "Efectivo" }],
    isLoading: false,
  }),
}));

const mockRouterPush = jest.fn();

import { CancelQuoteModal } from "../../../../../../app/(private)/quotes/_blocks/CancelQuoteModal";
import { AuthorizeQuoteModal } from "../../../../../../app/(private)/quotes/_blocks/AuthorizeQuoteModal";
import { ConvertQuoteModal } from "../../../../../../app/(private)/quotes/_blocks/ConvertQuoteModal";
import { QuoteActionsBar } from "../../../../../../app/(private)/quotes/_blocks/QuoteActionsBar";
import {
  QuoteAlreadyCancelledError,
  QuoteAlreadyConvertedError,
  QuoteExpiredError,
  QuoteNotEditableError,
  FolioInactiveError,
} from "../../../../../../app/(private)/quotes/_logic/errors";
import type { QuoteDetail } from "../../../../../../app/(private)/quotes/_logic/types/domain";
import type { SaleDetail } from "../../../../../../app/(private)/sales/_logic/types/domain";

const baseQuote: QuoteDetail = {
  id: "q1",
  branchId: "b1",
  customerId: null,
  customerName: null,
  creatorId: "u1",
  creatorName: null,
  folioId: "f1",
  folioNumber: 1,
  folioPrefix: "COT",
  status: "draft",
  isExpired: false,
  subtotal: 100,
  taxTotal: 16,
  total: 116,
  expiresAt: null,
  createdAt: new Date("2026-06-01"),
  updatedAt: new Date("2026-06-01"),
  items: [],
};

describe("CancelQuoteModal", () => {
  function makeCancel(impl: () => Promise<void>) {
    return (_id: string, _body: unknown, onChange?: (q: QuoteDetail) => void) => {
      return impl().then(() => onChange?.(baseQuote));
    };
  }

  it("renderiza el formulario de cancelación normalmente", () => {
    render(
      <CancelQuoteModal
        quote={baseQuote}
        isSaving={false}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
        onError={jest.fn()}
        cancel={jest.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(screen.getByRole("heading", { name: /Cancelar cotización/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancelar cotización/i })).toBeInTheDocument();
  });

  it("al cancelar con éxito, invoca onSuccess", async () => {
    const onSuccess = jest.fn();
    const cancel = jest.fn().mockImplementation(async (_id: string, _body: unknown, onChange?: (q: QuoteDetail) => void) => {
      onChange?.(baseQuote);
    });
    render(
      <CancelQuoteModal
        quote={baseQuote}
        isSaving={false}
        onClose={jest.fn()}
        onSuccess={onSuccess}
        onError={jest.fn()}
        cancel={cancel}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Cancelar cotización/i }));
    await screen.findByRole("button", { name: /Cancelar cotización/i });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("cuando 409 ya convertida, muestra deep-link a la venta", async () => {
    const cancel = jest.fn().mockRejectedValue(new QuoteAlreadyConvertedError("s99"));
    render(
      <CancelQuoteModal
        quote={baseQuote}
        isSaving={false}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
        onError={jest.fn()}
        cancel={cancel}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Cancelar cotización/i }));
    const link = await screen.findByRole("link", { name: /Ir a la venta/i });
    expect(link).toHaveAttribute("href", "/sales/s99");
  });

  it("cuando 409 ya cancelada, invoca onSuccess (idempotente)", async () => {
    const onSuccess = jest.fn();
    const cancel = jest.fn().mockRejectedValue(new QuoteAlreadyCancelledError());
    render(
      <CancelQuoteModal
        quote={baseQuote}
        isSaving={false}
        onClose={jest.fn()}
        onSuccess={onSuccess}
        onError={jest.fn()}
        cancel={cancel}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Cancelar cotización/i }));
    await screen.findByRole("button", { name: /Cancelar cotización/i });
    expect(onSuccess).toHaveBeenCalled();
  });
});

describe("QuoteActionsBar", () => {
  const fullCan = (perm: string): boolean | "loading" => {
    return ["quotes:authorize", "quotes:write", "quotes:cancel", "quotes:convert"].includes(perm);
  };

  it("draft: muestra Autorizar, Editar y Cancelar", () => {
    render(
      <QuoteActionsBar
        quote={{ ...baseQuote, status: "draft" }}
        can={fullCan}
        isSaving={false}
        onAuthorize={jest.fn()}
        onCancel={jest.fn()}
        onConvert={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Autorizar/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Editar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancelar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Convertir/i })).not.toBeInTheDocument();
  });

  it("authorized: muestra Convertir y Cancelar, no Autorizar ni Editar", () => {
    render(
      <QuoteActionsBar
        quote={{ ...baseQuote, status: "authorized" }}
        can={fullCan}
        isSaving={false}
        onAuthorize={jest.fn()}
        onCancel={jest.fn()}
        onConvert={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Convertir/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancelar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Autorizar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Editar/i })).not.toBeInTheDocument();
  });

  it("authorized + isExpired: Convertir está deshabilitado", () => {
    render(
      <QuoteActionsBar
        quote={{ ...baseQuote, status: "authorized", isExpired: true }}
        can={fullCan}
        isSaving={false}
        onAuthorize={jest.fn()}
        onCancel={jest.fn()}
        onConvert={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Convertir/i })).toBeDisabled();
  });

  it("converted con convertedSaleId: muestra enlace Ver venta", () => {
    render(
      <QuoteActionsBar
        quote={{ ...baseQuote, status: "converted", convertedSaleId: "s1" }}
        can={fullCan}
        isSaving={false}
        onAuthorize={jest.fn()}
        onCancel={jest.fn()}
        onConvert={jest.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: /Ver venta/i })).toHaveAttribute("href", "/sales/s1");
  });

  it("cancelled: no renderiza botones", () => {
    const { container } = render(
      <QuoteActionsBar
        quote={{ ...baseQuote, status: "cancelled" }}
        can={fullCan}
        isSaving={false}
        onAuthorize={jest.fn()}
        onCancel={jest.fn()}
        onConvert={jest.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('loading state: muestra Spinner cuando can() devuelve "loading"', () => {
    render(
      <QuoteActionsBar
        quote={baseQuote}
        can={() => "loading"}
        isSaving={false}
        onAuthorize={jest.fn()}
        onCancel={jest.fn()}
        onConvert={jest.fn()}
      />,
    );
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("draft + isExpired: Autorizar está deshabilitado con tooltip", () => {
    render(
      <QuoteActionsBar
        quote={{ ...baseQuote, status: "draft", isExpired: true }}
        can={fullCan}
        isSaving={false}
        onAuthorize={jest.fn()}
        onCancel={jest.fn()}
        onConvert={jest.fn()}
      />,
    );
    const btn = screen.getByRole("button", { name: /Autorizar/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("title", "Extiende la fecha de vencimiento primero");
  });
});

describe("AuthorizeQuoteModal", () => {
  function renderModal(overrides: Partial<Parameters<typeof AuthorizeQuoteModal>[0]> = {}) {
    const authorize = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const onSuccess = jest.fn();
    const onError = jest.fn();
    render(
      <AuthorizeQuoteModal
        quote={baseQuote}
        isSaving={false}
        onClose={onClose}
        onSuccess={onSuccess}
        onError={onError}
        authorize={authorize}
        {...overrides}
      />,
    );
    return { authorize, onClose, onSuccess, onError };
  }

  it("renderiza el modal con botón Autorizar", () => {
    renderModal();
    expect(screen.getByRole("heading", { name: /Autorizar cotización/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Autorizar$/i })).toBeInTheDocument();
  });

  it("submit deshabilitado mientras isSaving=true", () => {
    renderModal({ isSaving: true });
    expect(screen.getByRole("button", { name: /^Autorizar$/i })).toBeDisabled();
  });

  it("al confirmar sin error invoca authorize y onSuccess", async () => {
    const { authorize, onSuccess } = renderModal();
    authorize.mockImplementation(async (_id: string, _body: unknown, onChange?: (q: QuoteDetail) => void) => {
      onChange?.(baseQuote);
    });
    fireEvent.click(screen.getByRole("button", { name: /^Autorizar$/i }));
    await screen.findByRole("button", { name: /^Autorizar$/i });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("409 Quote expired muestra error inline y no cierra", async () => {
    const { authorize, onClose } = renderModal();
    authorize.mockRejectedValue(new QuoteExpiredError());
    fireEvent.click(screen.getByRole("button", { name: /^Autorizar$/i }));
    await screen.findByText(/vencido/i);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("409 estado incorrecto cierra el modal y llama onError", async () => {
    const { authorize, onClose, onError } = renderModal();
    authorize.mockRejectedValue(new QuoteNotEditableError("authorized"));
    fireEvent.click(screen.getByRole("button", { name: /^Autorizar$/i }));
    await screen.findByRole("button", { name: /^Autorizar$/i });
    expect(onError).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

describe("ConvertQuoteModal", () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
  });

  function renderModal(overrides: Partial<Parameters<typeof ConvertQuoteModal>[0]> = {}) {
    const convert = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const onError = jest.fn();
    render(
      <ConvertQuoteModal
        quote={baseQuote}
        isSaving={false}
        onClose={onClose}
        onError={onError}
        convert={convert}
        {...overrides}
      />,
    );
    return { convert, onClose, onError };
  }

  it("renderiza el modal con selectores de folio y forma de pago", () => {
    renderModal();
    expect(screen.getByRole("heading", { name: /Convertir a venta/i })).toBeInTheDocument();
    // Debe haber al menos dos selects (folio y forma de pago)
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(2);
  });

  it("submit deshabilitado cuando folio o pago están vacíos", () => {
    renderModal();
    expect(screen.getByRole("button", { name: /^Convertir$/i })).toBeDisabled();
  });

  it("submit habilitado cuando folio y forma de pago están seleccionados", async () => {
    renderModal();
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "f2" } });
    fireEvent.change(selects[1], { target: { value: "pm1" } });
    expect(screen.getByRole("button", { name: /^Convertir$/i })).not.toBeDisabled();
  });

  it("en 200 navega a /sales/[id] via router.push", async () => {
    const fakeSale = { id: "s99" } as SaleDetail;
    const { convert } = renderModal();
    convert.mockImplementation(async (_id: string, _body: unknown, onChange?: (s: SaleDetail) => void) => {
      onChange?.(fakeSale);
    });
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "f2" } });
    fireEvent.change(selects[1], { target: { value: "pm1" } });
    fireEvent.click(screen.getByRole("button", { name: /^Convertir$/i }));
    await screen.findByRole("button", { name: /^Convertir$/i });
    expect(mockRouterPush).toHaveBeenCalledWith("/sales/s99");
  });

  it("400 folio inactivo muestra error inline", async () => {
    const { convert } = renderModal();
    convert.mockRejectedValue(new FolioInactiveError());
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "f2" } });
    fireEvent.change(selects[1], { target: { value: "pm1" } });
    fireEvent.click(screen.getByRole("button", { name: /^Convertir$/i }));
    await screen.findByText(/folio.*inactivo/i);
  });

  it("409 cotización vencida muestra error inline", async () => {
    const { convert } = renderModal();
    convert.mockRejectedValue(new QuoteExpiredError());
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "f2" } });
    fireEvent.change(selects[1], { target: { value: "pm1" } });
    fireEvent.click(screen.getByRole("button", { name: /^Convertir$/i }));
    await screen.findByText(/vencid/i);
  });
});
