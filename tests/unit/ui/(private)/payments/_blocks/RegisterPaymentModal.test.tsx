/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

jest.mock("../../../../../../app/_hooks/useFoliosOptions");
jest.mock("../../../../../../app/_hooks/usePaymentMethodsOptions");
jest.mock("../../../../../../app/(private)/payments/_logic/services/registerPayment");

import { useFoliosOptions } from "../../../../../../app/_hooks/useFoliosOptions";
import { usePaymentMethodsOptions } from "../../../../../../app/_hooks/usePaymentMethodsOptions";
import { registerPayment } from "../../../../../../app/(private)/payments/_logic/services/registerPayment";
import { RegisterPaymentModal } from "../../../../../../app/(private)/payments/_blocks/RegisterPaymentModal";
import { PaymentExceedsDueAmountError } from "../../../../../../app/(private)/payments/_logic/errors";

const mockUseFoliosOptions = useFoliosOptions as jest.MockedFunction<typeof useFoliosOptions>;
const mockUsePaymentMethodsOptions = usePaymentMethodsOptions as jest.MockedFunction<typeof usePaymentMethodsOptions>;
const mockRegisterPayment = registerPayment as jest.MockedFunction<typeof registerPayment>;

const FOLIO_RECIBO = { id: "f-recibo", code: "RECIBO", name: "Recibo", prefix: "RECIBO-", currentNumber: 1, isActive: true };
const FOLIO_FACT = { id: "f-fact", code: "FACT", name: "Factura", prefix: "F-", currentNumber: 1, isActive: true };
const METHOD = { id: "pm1", code: "EFE", name: "Efectivo", isActive: true };

function setup() {
  mockUseFoliosOptions.mockReturnValue({ options: [FOLIO_RECIBO, FOLIO_FACT], isLoading: false, refresh: jest.fn() });
  mockUsePaymentMethodsOptions.mockReturnValue({ options: [METHOD], isLoading: false, refresh: jest.fn() });
}

// jsdom doesn't implement showModal/close, so polyfill
Object.defineProperty(HTMLDialogElement.prototype, "showModal", { value: jest.fn(), writable: true });
Object.defineProperty(HTMLDialogElement.prototype, "close", { value: jest.fn(), writable: true });

describe("RegisterPaymentModal", () => {
  beforeEach(() => {
    setup();
    jest.clearAllMocks();
  });

  it("preselecciona folio RECIBO cuando está disponible", () => {
    render(<RegisterPaymentModal saleId="s1" dueAmount={500} onSuccess={jest.fn()} onClose={jest.fn()} />);
    const folioSelect = screen.getByLabelText(/Folio de recibo/i) as HTMLSelectElement;
    expect(folioSelect.value).toBe("f-recibo");
  });

  it("muestra el saldo pendiente como hint", () => {
    render(<RegisterPaymentModal saleId="s1" dueAmount={300} onSuccess={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText(/\$300/)).toBeInTheDocument();
  });

  it("muestra error inline cuando amount es 0", async () => {
    render(<RegisterPaymentModal saleId="s1" dueAmount={500} onSuccess={jest.fn()} onClose={jest.fn()} />);
    const amountInput = screen.getByLabelText(/Monto/i);
    fireEvent.change(amountInput, { target: { value: "0" } });
    fireEvent.submit(amountInput.closest("form")!);
    await waitFor(() => {
      expect(screen.getByText(/mayor a 0/i)).toBeInTheDocument();
    });
  });

  it("muestra error inline PaymentExceedsDueAmount en campo amount", async () => {
    mockRegisterPayment.mockRejectedValue(new PaymentExceedsDueAmountError("300.00"));
    render(<RegisterPaymentModal saleId="s1" dueAmount={300} onSuccess={jest.fn()} onClose={jest.fn()} />);
    // Wait for effects to flush (folioId + paymentMethodId selects)
    await waitFor(() => {
      const sel = screen.getByLabelText(/Folio de recibo/i) as HTMLSelectElement;
      expect(sel.value).toBe("f-recibo");
    });
    fireEvent.change(screen.getByLabelText(/Monto/i), { target: { value: "500" } });
    await act(async () => {
      fireEvent.submit(screen.getByLabelText(/Monto/i).closest("form")!);
    });
    await waitFor(() => {
      expect(screen.getByText(/saldo pendiente.*300/i)).toBeInTheDocument();
    });
  });

  it("llama onSuccess en respuesta exitosa", async () => {
    mockRegisterPayment.mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    render(<RegisterPaymentModal saleId="s1" dueAmount={500} onSuccess={onSuccess} onClose={jest.fn()} />);
    const amountInput = screen.getByLabelText(/Monto/i);
    fireEvent.change(amountInput, { target: { value: "100" } });
    await act(async () => {
      fireEvent.submit(amountInput.closest("form")!);
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
