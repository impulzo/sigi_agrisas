import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BranchEditModal } from "../../../../../../app/(private)/catalogs/branches/_blocks/BranchEditModal";
import type { Branch } from "../../../../../../app/(private)/catalogs/branches/_logic/types/domain";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn(function(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = jest.fn(function(this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

const BASE_ENTITY: Branch = {
  id: "b1",
  code: "CDMX_01",
  name: "Ciudad de México",
  address: "Av. Insurgentes 1234",
  phone: "5512345678",
  email: "cdmx@empresa.com",
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

describe("BranchEditModal — modo create", () => {
  it("renderiza título 'Nueva Sucursal'", () => {
    render(<BranchEditModal {...defaultProps} mode="create" entity={null} />);
    expect(screen.getByText("Nueva Sucursal")).toBeInTheDocument();
  });

  it("campo code habilitado en modo create", () => {
    render(<BranchEditModal {...defaultProps} mode="create" entity={null} />);
    expect(screen.getByLabelText("Código")).not.toBeDisabled();
  });

  it("botón Guardar deshabilitado cuando los campos están vacíos", () => {
    render(<BranchEditModal {...defaultProps} mode="create" entity={null} />);
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });

  it("código con caracteres inválidos no permite guardar", async () => {
    render(<BranchEditModal {...defaultProps} mode="create" entity={null} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Código"), "INVALID-CODE");
    await user.type(screen.getByLabelText("Nombre"), "Test");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(screen.getByText(/código inválido/i)).toBeInTheDocument();
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it("email inválido muestra error de validación", async () => {
    render(<BranchEditModal {...defaultProps} mode="create" entity={null} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Código"), "VALIDO");
    await user.type(screen.getByLabelText("Nombre"), "Nombre válido");
    await user.type(screen.getByLabelText("Email"), "correo-sin-arroba");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it("código 409 muestra error inline en campo code", () => {
    render(
      <BranchEditModal
        {...defaultProps}
        mode="create"
        entity={null}
        codeError="Ese código ya está en uso"
      />
    );
    expect(screen.getByText("Ese código ya está en uso")).toBeInTheDocument();
  });

  it("submit válido llama onSave con los datos", async () => {
    const onSave = jest.fn();
    render(<BranchEditModal {...defaultProps} mode="create" entity={null} onSave={onSave} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Código"), "NUEVA");
    await user.type(screen.getByLabelText("Nombre"), "Nueva sucursal");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ code: "NUEVA", name: "Nueva sucursal" })
    );
  });
});

describe("BranchEditModal — modo edit", () => {
  it("renderiza título 'Editar Sucursal'", () => {
    render(<BranchEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByText("Editar Sucursal")).toBeInTheDocument();
  });

  it("campo code deshabilitado en modo edit", () => {
    render(<BranchEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByLabelText("Código")).toBeDisabled();
  });

  it("campos pre-rellenos con los datos del entity", () => {
    render(<BranchEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByLabelText("Nombre")).toHaveValue("Ciudad de México");
    expect(screen.getByLabelText("Email")).toHaveValue("cdmx@empresa.com");
  });

  it("botón Guardar deshabilitado cuando no hay diff", () => {
    render(<BranchEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });

  it("botón Guardar habilitado cuando hay cambios", async () => {
    render(<BranchEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "CDMX actualizado");
    expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();
  });

  it("onSave recibe solo el diff cuando hay cambios", async () => {
    const onSave = jest.fn();
    render(
      <BranchEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} onSave={onSave} />
    );
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "CDMX 2");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledWith({ name: "CDMX 2" });
  });

  it("limpiar email envía null en el diff", async () => {
    const onSave = jest.fn();
    render(
      <BranchEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} onSave={onSave} />
    );
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Email"));
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ email: null }));
  });
});
