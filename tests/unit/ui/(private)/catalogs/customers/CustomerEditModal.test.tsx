import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerEditModal } from "../../../../../../app/(private)/catalogs/customers/_blocks/CustomerEditModal";
import type { Customer } from "../../../../../../app/(private)/catalogs/customers/_logic/types/domain";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

const BASE_ENTITY: Customer = {
  id: "c1",
  code: "CLI_001",
  name: "Cliente ACME",
  rfc: "SAC120101A12",
  legalName: "ACME S.A.",
  taxRegime: "601",
  cfdiUse: "G03",
  taxZipCode: "06600",
  email: "contacto@acme.com",
  phone: "5555-1234",
  address: "Av. Reforma 123",
  contactName: "Juan Pérez",
  notes: null,
  creditLimit: 50000,
  currentBalance: 1000,
  creditDays: 30,
  isActive: true,
  createdAt: new Date("2026-05-25"),
  updatedAt: new Date("2026-05-25"),
};

const defaultProps = {
  open: true,
  isSaving: false,
  codeError: null,
  rfcError: null,
  mutationError: null,
  onSave: jest.fn(),
  onClose: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CustomerEditModal — sections rendered", () => {
  it("renders three section headings: Datos básicos, Datos fiscales, Contacto y crédito", () => {
    render(<CustomerEditModal {...defaultProps} mode="create" entity={null} />);
    expect(screen.getByText(/datos básicos/i)).toBeInTheDocument();
    expect(screen.getByText(/datos fiscales/i)).toBeInTheDocument();
    expect(screen.getByText(/contacto y crédito/i)).toBeInTheDocument();
  });
});

describe("CustomerEditModal — create mode", () => {
  it("renders 'Nuevo cliente' title", () => {
    render(<CustomerEditModal {...defaultProps} mode="create" entity={null} />);
    expect(screen.getByText("Nuevo cliente")).toBeInTheDocument();
  });

  it("code field is enabled in create mode", () => {
    render(<CustomerEditModal {...defaultProps} mode="create" entity={null} />);
    expect(screen.getByLabelText(/código/i)).not.toBeDisabled();
  });

  it("forces uppercase as user types code", async () => {
    render(<CustomerEditModal {...defaultProps} mode="create" entity={null} />);
    const input = screen.getByLabelText(/código/i) as HTMLInputElement;
    await userEvent.setup().type(input, "cli_001");
    expect(input.value).toBe("CLI_001");
  });

  it("invalid rfc shows inline validation error", async () => {
    const onSave = jest.fn();
    render(<CustomerEditModal {...defaultProps} mode="create" entity={null} onSave={onSave} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/código/i), "CLI_001");
    await user.type(screen.getByLabelText(/^nombre/i), "Test");
    await user.type(screen.getByLabelText(/rfc/i), "ABC123");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(screen.getByText(/rfc inválido/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submit with valid required fields calls onSave without forcing creditDays", async () => {
    const onSave = jest.fn();
    render(<CustomerEditModal {...defaultProps} mode="create" entity={null} onSave={onSave} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/código/i), "CLI_001");
    await user.type(screen.getByLabelText(/^nombre/i), "Cliente ACME");
    await user.type(screen.getByLabelText(/rfc/i), "SAC120101A12");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "CLI_001",
        name: "Cliente ACME",
        rfc: "SAC120101A12",
      }),
    );
    const payload = onSave.mock.calls[0][0];
    expect(payload.creditDays).toBeUndefined();
  });

  it("submit with a custom creditDays value includes it in the payload", async () => {
    const onSave = jest.fn();
    render(<CustomerEditModal {...defaultProps} mode="create" entity={null} onSave={onSave} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/código/i), "CLI_001");
    await user.type(screen.getByLabelText(/^nombre/i), "Cliente ACME");
    await user.type(screen.getByLabelText(/rfc/i), "SAC120101A12");
    await user.type(screen.getByLabelText(/plazo de crédito/i), "45");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ creditDays: 45 }));
  });

  it("codeError prop shows inline error under code field", () => {
    render(
      <CustomerEditModal
        {...defaultProps}
        mode="create"
        entity={null}
        codeError="Este código ya está en uso."
      />,
    );
    expect(screen.getByText("Este código ya está en uso.")).toBeInTheDocument();
  });

  it("rfcError prop shows inline error under rfc field", () => {
    render(
      <CustomerEditModal
        {...defaultProps}
        mode="create"
        entity={null}
        rfcError="Este RFC ya está en uso por otro cliente."
      />,
    );
    expect(screen.getByText("Este RFC ya está en uso por otro cliente.")).toBeInTheDocument();
  });
});

describe("CustomerEditModal — edit mode", () => {
  it("renders 'Editar cliente' title", () => {
    render(<CustomerEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByText("Editar cliente")).toBeInTheDocument();
  });

  it("code field is disabled in edit mode", () => {
    render(<CustomerEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByLabelText(/código/i)).toBeDisabled();
  });

  it("pre-fills creditLimit and creditDays with entity values", () => {
    render(<CustomerEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByLabelText(/límite de crédito/i)).toHaveValue(50000);
    expect(screen.getByLabelText(/plazo de crédito/i)).toHaveValue(30);
  });

  it("save button disabled when diff is empty", () => {
    render(<CustomerEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });

  it("onSave receives only creditDays when it is the only changed field", async () => {
    const onSave = jest.fn();
    render(<CustomerEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} onSave={onSave} />);
    const user = userEvent.setup();
    const creditDaysInput = screen.getByLabelText(/plazo de crédito/i);
    await user.clear(creditDaysInput);
    await user.type(creditDaysInput, "60");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledWith({ creditDays: 60 });
  });

  it("clearing creditLimit sends null in diff", async () => {
    const onSave = jest.fn();
    render(<CustomerEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} onSave={onSave} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/límite de crédito/i));
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ creditLimit: null }));
  });
});
