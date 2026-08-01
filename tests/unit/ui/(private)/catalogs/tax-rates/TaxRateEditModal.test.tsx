import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaxRateEditModal } from "../../../../../../app/(private)/catalogs/tax-rates/_blocks/TaxRateEditModal";
import type { TaxRate } from "../../../../../../app/(private)/catalogs/tax-rates/_logic/types/domain";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

const BASE_ENTITY: TaxRate = {
  id: "tr1",
  code: "IVA_16",
  name: "IVA 16%",
  description: "Impuesto al Valor Agregado tasa general 16%",
  satTaxCode: "002",
  factorType: "Tasa",
  displayValue: 16,
  rate: 0.16,
  transferredAccount: null,
  pendingTransferredAccount: null,
  creditedAccount: null,
  pendingCreditedAccount: null,
  isActive: true,
  createdAt: new Date("2026-05-01"),
  updatedAt: new Date("2026-05-01"),
};

const defaultProps = {
  open: true,
  isSaving: false,
  codeError: null,
  mutationError: null,
  onSave: jest.fn(),
  onClose: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("TaxRateEditModal — modo create", () => {
  it("renderiza título 'Nueva Tasa de Impuesto'", () => {
    render(<TaxRateEditModal {...defaultProps} mode="create" entity={null} />);
    expect(screen.getByText("Nueva Tasa de Impuesto")).toBeInTheDocument();
  });

  it("campo Código habilitado en modo create", () => {
    render(<TaxRateEditModal {...defaultProps} mode="create" entity={null} />);
    expect(screen.getByLabelText("Código")).not.toBeDisabled();
  });

  it("botón Guardar deshabilitado cuando los campos están vacíos", () => {
    render(<TaxRateEditModal {...defaultProps} mode="create" entity={null} />);
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });

  it("código con caracteres inválidos no permite guardar", async () => {
    render(<TaxRateEditModal {...defaultProps} mode="create" entity={null} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Código"), "invalido-código");
    await user.type(screen.getByLabelText("Nombre"), "Test");
    await user.type(screen.getByLabelText("Clave SAT"), "002");
    await user.type(screen.getByLabelText("Valor"), "16");
    await user.type(screen.getByLabelText("Tasa/Cuota (%)"), "16");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(screen.getByText(/código inválido/i)).toBeInTheDocument();
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it("código 409 muestra error inline en campo Código", () => {
    render(
      <TaxRateEditModal {...defaultProps} mode="create" entity={null} codeError="Código ya en uso" />
    );
    expect(screen.getByText("Código ya en uso")).toBeInTheDocument();
  });

  it("submit válido llama onSave con code, satTaxCode, factorType, displayValue y rate/100", async () => {
    const onSave = jest.fn();
    render(<TaxRateEditModal {...defaultProps} mode="create" entity={null} onSave={onSave} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Código"), "IEPS_8");
    await user.type(screen.getByLabelText("Nombre"), "IEPS 8%");
    await user.type(screen.getByLabelText("Clave SAT"), "003");
    await user.type(screen.getByLabelText("Valor"), "8");
    await user.type(screen.getByLabelText("Tasa/Cuota (%)"), "8");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "IEPS_8",
        name: "IEPS 8%",
        satTaxCode: "003",
        factorType: "Tasa",
        displayValue: 8,
        rate: 0.08,
      })
    );
  });
});

describe("TaxRateEditModal — modo edit", () => {
  it("renderiza título 'Editar Tasa de Impuesto'", () => {
    render(<TaxRateEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByText("Editar Tasa de Impuesto")).toBeInTheDocument();
  });

  it("campo Código deshabilitado en modo edit", () => {
    render(<TaxRateEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByLabelText("Código")).toBeDisabled();
  });

  it("campos pre-rellenos con los datos del entity", () => {
    render(<TaxRateEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByLabelText("Nombre")).toHaveValue("IVA 16%");
    expect(screen.getByLabelText("Clave SAT")).toHaveValue("002");
    expect(screen.getByLabelText("Tasa/Cuota (%)")).toHaveValue(16);
  });

  it("botón Guardar deshabilitado cuando no hay diff", () => {
    render(<TaxRateEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });

  it("botón Guardar habilitado cuando hay cambios", async () => {
    render(<TaxRateEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "IVA 16% actualizado");
    expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();
  });

  it("onSave recibe solo el diff cuando hay cambios", async () => {
    const onSave = jest.fn();
    render(<TaxRateEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} onSave={onSave} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "IVA 16% v2");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledWith({ name: "IVA 16% v2" });
  });
});
