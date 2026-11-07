/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

jest.mock("../../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../../app/_hooks/useBranchesOptions", () => ({
  useBranchesOptions: () => ({ options: [] }),
}));
jest.mock("../../../../../../app/_hooks/useFoliosOptions");
jest.mock("../../../../../../app/_hooks/usePaymentMethodsOptions");
jest.mock("../../../../../../app/(private)/payments/_logic/hooks/useCustomerAccountDebt");
jest.mock("../../../../../../app/(private)/payments/_logic/services/registerAccountPayment");
jest.mock("../../../../../../app/(private)/pos/_blocks/CustomerPicker", () => ({
  CustomerPicker: ({ onChange }: { onChange: (id: string, customer: null) => void }) => (
    <button type="button" onClick={() => onChange("cust-1", null)}>Elegir cliente de prueba</button>
  ),
}));
jest.mock("../../../../../../app/(private)/payments/_blocks/RegisterPaymentModal", () => ({
  RegisterPaymentModal: ({ saleId, onSuccess }: { saleId: string; onSuccess: () => void }) => (
    <div data-testid="nested-sale-modal">
      <span>saleId:{saleId}</span>
      <button type="button" onClick={onSuccess}>Simular abono a venta exitoso</button>
    </div>
  ),
}));

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import { useFoliosOptions } from "../../../../../../app/_hooks/useFoliosOptions";
import { usePaymentMethodsOptions } from "../../../../../../app/_hooks/usePaymentMethodsOptions";
import { useCustomerAccountDebt } from "../../../../../../app/(private)/payments/_logic/hooks/useCustomerAccountDebt";
import { registerAccountPayment } from "../../../../../../app/(private)/payments/_logic/services/registerAccountPayment";
import { RegisterGlobalPaymentModal } from "../../../../../../app/(private)/payments/_blocks/RegisterGlobalPaymentModal";
import { PaymentExceedsAccountDebtError } from "../../../../../../app/(private)/payments/_logic/errors";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUseFoliosOptions = useFoliosOptions as jest.MockedFunction<typeof useFoliosOptions>;
const mockUsePaymentMethodsOptions = usePaymentMethodsOptions as jest.MockedFunction<typeof usePaymentMethodsOptions>;
const mockUseCustomerAccountDebt = useCustomerAccountDebt as jest.MockedFunction<typeof useCustomerAccountDebt>;
const mockRegisterAccountPayment = registerAccountPayment as jest.MockedFunction<typeof registerAccountPayment>;

const FOLIO_RB = { id: "f-rb", code: "RB", name: "Recibo de Pago - Cobranza", prefix: "RB-", scope: "OPERATIONS" as const, currentNumber: 1, isActive: true, branchCurrentNumber: null, nextFolioCode: null };
const METHOD = { id: "pm1", code: "EFE", name: "Efectivo", isActive: true, isCredit: false };

Object.defineProperty(HTMLDialogElement.prototype, "showModal", { value: jest.fn(), writable: true });
Object.defineProperty(HTMLDialogElement.prototype, "close", { value: jest.fn(), writable: true });

function setupCommon(isBypass = false) {
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "test@test.com",
    roles: [],
    branchId: "b1",
    isLoading: false,
    can: jest.fn((perm: string) => (perm === "branches:access_all" ? isBypass : false)),
    refresh: jest.fn(),
  });
  mockUseFoliosOptions.mockReturnValue({ options: [FOLIO_RB], isLoading: false, refresh: jest.fn() });
  mockUsePaymentMethodsOptions.mockReturnValue({ options: [METHOD], isLoading: false, refresh: jest.fn() });
}

function pickTestCustomer() {
  fireEvent.click(screen.getByText("Elegir cliente de prueba"));
}

describe("RegisterGlobalPaymentModal", () => {
  beforeEach(() => jest.clearAllMocks());

  it("no muestra ventas pendientes ni formulario de saldo general antes de elegir cliente", () => {
    setupCommon();
    mockUseCustomerAccountDebt.mockReturnValue({
      currentBalance: 0, pendingSales: [], accountDebt: 0, isLoading: false, error: null, refresh: jest.fn(),
    });
    render(<RegisterGlobalPaymentModal onSuccess={jest.fn()} onClose={jest.fn()} />);
    expect(screen.queryByText("Ventas pendientes")).not.toBeInTheDocument();
  });

  it("al elegir cliente, muestra la tabla de ventas pendientes y el formulario de saldo general", () => {
    setupCommon();
    mockUseCustomerAccountDebt.mockReturnValue({
      currentBalance: 500,
      pendingSales: [{ saleId: "sale-1", folioCode: "VNT-000001", total: 300, paidAmount: 0, due: 300, createdAt: new Date() }],
      accountDebt: 200,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<RegisterGlobalPaymentModal onSuccess={jest.fn()} onClose={jest.fn()} />);

    pickTestCustomer();

    expect(screen.getByText("Ventas pendientes")).toBeInTheDocument();
    expect(screen.getByText("VNT-000001")).toBeInTheDocument();
    expect(screen.getByText(/Saldo general sin ticket/)).toBeInTheDocument();
  });

  it("abre el RegisterPaymentModal existente con el saleId elegido al hacer click en 'Abonar'", () => {
    setupCommon();
    mockUseCustomerAccountDebt.mockReturnValue({
      currentBalance: 300,
      pendingSales: [{ saleId: "sale-1", folioCode: "VNT-000001", total: 300, paidAmount: 0, due: 300, createdAt: new Date() }],
      accountDebt: 0,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<RegisterGlobalPaymentModal onSuccess={jest.fn()} onClose={jest.fn()} />);
    pickTestCustomer();

    fireEvent.click(screen.getByText("Abonar"));
    expect(screen.getByTestId("nested-sale-modal")).toBeInTheDocument();
    expect(screen.getByText("saleId:sale-1")).toBeInTheDocument();
  });

  it("muestra estado vacío cuando el cliente no tiene saldo pendiente", () => {
    setupCommon();
    mockUseCustomerAccountDebt.mockReturnValue({
      currentBalance: 0, pendingSales: [], accountDebt: 0, isLoading: false, error: null, refresh: jest.fn(),
    });
    render(<RegisterGlobalPaymentModal onSuccess={jest.fn()} onClose={jest.fn()} />);
    pickTestCustomer();

    expect(screen.getByText("Este cliente no tiene saldo pendiente.")).toBeInTheDocument();
  });

  it("exige sucursal cuando el caller tiene bypass antes de registrar el abono a saldo general", async () => {
    setupCommon(true);
    mockUseCustomerAccountDebt.mockReturnValue({
      currentBalance: 200, pendingSales: [], accountDebt: 200, isLoading: false, error: null, refresh: jest.fn(),
    });
    render(<RegisterGlobalPaymentModal onSuccess={jest.fn()} onClose={jest.fn()} />);
    pickTestCustomer();

    await waitFor(() => {
      const sel = screen.getByLabelText(/Folio de recibo/i) as HTMLSelectElement;
      expect(sel.value).toBe("f-rb");
    });
    fireEvent.change(screen.getByLabelText(/^Monto$/i), { target: { value: "200" } });
    fireEvent.submit(screen.getByLabelText(/^Monto$/i).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/para este abono/i)).toBeInTheDocument();
    });
    expect(mockRegisterAccountPayment).not.toHaveBeenCalled();
  });

  it("registra el abono a saldo general y llama onSuccess", async () => {
    setupCommon(false);
    const refresh = jest.fn();
    mockUseCustomerAccountDebt.mockReturnValue({
      currentBalance: 200, pendingSales: [], accountDebt: 200, isLoading: false, error: null, refresh,
    });
    mockRegisterAccountPayment.mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    render(<RegisterGlobalPaymentModal onSuccess={onSuccess} onClose={jest.fn()} />);
    pickTestCustomer();

    await waitFor(() => {
      const sel = screen.getByLabelText(/Folio de recibo/i) as HTMLSelectElement;
      expect(sel.value).toBe("f-rb");
    });
    fireEvent.change(screen.getByLabelText(/^Monto$/i), { target: { value: "200" } });
    await act(async () => {
      fireEvent.submit(screen.getByLabelText(/^Monto$/i).closest("form")!);
    });

    expect(mockRegisterAccountPayment).toHaveBeenCalledWith(
      "cust-1",
      expect.objectContaining({ amount: 200, paymentMethodId: "pm1", folioId: "f-rb" })
    );
    expect(refresh).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it("muestra error inline PaymentExceedsAccountDebt en el campo monto", async () => {
    setupCommon(false);
    mockUseCustomerAccountDebt.mockReturnValue({
      currentBalance: 200, pendingSales: [], accountDebt: 200, isLoading: false, error: null, refresh: jest.fn(),
    });
    mockRegisterAccountPayment.mockRejectedValue(new PaymentExceedsAccountDebtError("200.0000"));
    render(<RegisterGlobalPaymentModal onSuccess={jest.fn()} onClose={jest.fn()} />);
    pickTestCustomer();

    await waitFor(() => {
      const sel = screen.getByLabelText(/Folio de recibo/i) as HTMLSelectElement;
      expect(sel.value).toBe("f-rb");
    });
    fireEvent.change(screen.getByLabelText(/^Monto$/i), { target: { value: "250" } });
    await act(async () => {
      fireEvent.submit(screen.getByLabelText(/^Monto$/i).closest("form")!);
    });

    await waitFor(() => {
      expect(screen.getByText(/supera la deuda sin ticket/i)).toBeInTheDocument();
    });
  });
});
