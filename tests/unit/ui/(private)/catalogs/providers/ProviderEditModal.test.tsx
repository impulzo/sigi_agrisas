import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProviderEditModal } from "../../../../../../app/(private)/catalogs/providers/_blocks/ProviderEditModal";
import type { Provider } from "../../../../../../app/(private)/catalogs/providers/_logic/types/domain";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

const BASE_ENTITY: Provider = {
  id: "p1",
  code: "PROV_001",
  name: "Semillas ACME",
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

describe("ProviderEditModal — sections rendered", () => {
  it("renders three section headings: Datos básicos, Datos fiscales, Contacto", () => {
    render(<ProviderEditModal {...defaultProps} mode="create" entity={null} />);
    expect(screen.getByText(/datos básicos/i)).toBeInTheDocument();
    expect(screen.getByText(/datos fiscales/i)).toBeInTheDocument();
    expect(screen.getByText(/^contacto$/i)).toBeInTheDocument();
  });
});

describe("ProviderEditModal — create mode", () => {
  it("renders 'Nuevo proveedor' title", () => {
    render(<ProviderEditModal {...defaultProps} mode="create" entity={null} />);
    expect(screen.getByText("Nuevo proveedor")).toBeInTheDocument();
  });

  it("code field is enabled in create mode", () => {
    render(<ProviderEditModal {...defaultProps} mode="create" entity={null} />);
    expect(screen.getByLabelText(/código/i)).not.toBeDisabled();
  });

  it("forces uppercase as user types code", async () => {
    render(<ProviderEditModal {...defaultProps} mode="create" entity={null} />);
    const input = screen.getByLabelText(/código/i) as HTMLInputElement;
    await userEvent.setup().type(input, "prov_001");
    expect(input.value).toBe("PROV_001");
  });

  it("forces uppercase as user types rfc", async () => {
    render(<ProviderEditModal {...defaultProps} mode="create" entity={null} />);
    const input = screen.getByLabelText(/rfc/i) as HTMLInputElement;
    await userEvent.setup().type(input, "sac120101a12");
    expect(input.value).toBe("SAC120101A12");
  });

  it("invalid code shows inline validation error", async () => {
    const onSave = jest.fn();
    render(<ProviderEditModal {...defaultProps} mode="create" entity={null} onSave={onSave} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/código/i), "INVALID-CODE");
    await user.type(screen.getByLabelText(/nombre/i), "Test");
    await user.type(screen.getByLabelText(/rfc/i), "SAC120101A12");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(screen.getByText(/código debe ser/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("invalid rfc shows inline validation error", async () => {
    const onSave = jest.fn();
    render(<ProviderEditModal {...defaultProps} mode="create" entity={null} onSave={onSave} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/código/i), "PROV_001");
    await user.type(screen.getByLabelText(/nombre/i), "Test");
    await user.type(screen.getByLabelText(/rfc/i), "ABC123");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(screen.getByText(/rfc inválido/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("invalid taxRegime shows inline validation error", async () => {
    const onSave = jest.fn();
    render(<ProviderEditModal {...defaultProps} mode="create" entity={null} onSave={onSave} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/código/i), "PROV_001");
    await user.type(screen.getByLabelText(/nombre/i), "Test");
    await user.type(screen.getByLabelText(/rfc/i), "SAC120101A12");
    await user.type(screen.getByLabelText(/régimen fiscal/i), "60");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(screen.getByText(/régimen fiscal debe ser de 3 dígitos/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submit with valid required fields calls onSave", async () => {
    const onSave = jest.fn();
    render(<ProviderEditModal {...defaultProps} mode="create" entity={null} onSave={onSave} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/código/i), "PROV_001");
    await user.type(screen.getByLabelText(/nombre/i), "Semillas Acme");
    await user.type(screen.getByLabelText(/rfc/i), "SAC120101A12");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "PROV_001",
        name: "Semillas Acme",
        rfc: "SAC120101A12",
      }),
    );
  });

  it("codeError prop shows inline error under code field", () => {
    render(
      <ProviderEditModal
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
      <ProviderEditModal
        {...defaultProps}
        mode="create"
        entity={null}
        rfcError="Este RFC ya está en uso por otro proveedor."
      />,
    );
    expect(screen.getByText("Este RFC ya está en uso por otro proveedor.")).toBeInTheDocument();
  });
});

describe("ProviderEditModal — edit mode", () => {
  it("renders 'Editar proveedor' title", () => {
    render(<ProviderEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByText("Editar proveedor")).toBeInTheDocument();
  });

  it("code field is disabled in edit mode", () => {
    render(<ProviderEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByLabelText(/código/i)).toBeDisabled();
  });

  it("rfc field is enabled in edit mode", () => {
    render(<ProviderEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByLabelText(/rfc/i)).not.toBeDisabled();
  });

  it("pre-fills fields with entity values", () => {
    render(<ProviderEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByLabelText(/nombre/i)).toHaveValue("Semillas ACME");
    expect(screen.getByLabelText(/razón social/i)).toHaveValue("ACME S.A.");
    expect(screen.getByLabelText(/régimen fiscal/i)).toHaveValue("601");
  });

  it("save button disabled when diff is empty", () => {
    render(<ProviderEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });

  it("save button enabled when a field is modified", async () => {
    render(<ProviderEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), "ACME Renombrado");
    expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();
  });

  it("onSave receives only the diff", async () => {
    const onSave = jest.fn();
    render(<ProviderEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} onSave={onSave} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), "ACME 2");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledWith({ name: "ACME 2" });
  });

  it("clearing optional field sends null in diff", async () => {
    const onSave = jest.fn();
    render(<ProviderEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} onSave={onSave} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/razón social/i));
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ legalName: null }));
  });
});
