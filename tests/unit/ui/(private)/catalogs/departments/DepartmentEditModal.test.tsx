import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DepartmentEditModal } from "../../../../../../app/(private)/catalogs/departments/_blocks/DepartmentEditModal";
import type { Department } from "../../../../../../app/(private)/catalogs/departments/_logic/types/domain";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn(function(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = jest.fn(function(this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

const BASE_ENTITY: Department = {
  id: "d1",
  code: "VENTAS",
  name: "Ventas",
  description: "Departamento de ventas",
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

describe("DepartmentEditModal — modo create", () => {
  it("renderiza título 'Nuevo Departamento'", () => {
    render(<DepartmentEditModal {...defaultProps} mode="create" entity={null} />);
    expect(screen.getByText("Nuevo Departamento")).toBeInTheDocument();
  });

  it("campo code habilitado en modo create", () => {
    render(<DepartmentEditModal {...defaultProps} mode="create" entity={null} />);
    expect(screen.getByLabelText("Código")).not.toBeDisabled();
  });

  it("botón Guardar deshabilitado cuando los campos están vacíos", () => {
    render(<DepartmentEditModal {...defaultProps} mode="create" entity={null} />);
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });

  it("código con caracteres inválidos no permite guardar", async () => {
    render(<DepartmentEditModal {...defaultProps} mode="create" entity={null} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Código"), "INVALID-CODE");
    await user.type(screen.getByLabelText("Nombre"), "Test");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(screen.getByText(/código inválido/i)).toBeInTheDocument();
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it("código 409 muestra error inline en campo code", () => {
    render(
      <DepartmentEditModal
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
    render(<DepartmentEditModal {...defaultProps} mode="create" entity={null} onSave={onSave} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Código"), "NUEVO");
    await user.type(screen.getByLabelText("Nombre"), "Nuevo departamento");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ code: "NUEVO", name: "Nuevo departamento" })
    );
  });
});

describe("DepartmentEditModal — modo edit", () => {
  it("renderiza título 'Editar Departamento'", () => {
    render(<DepartmentEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByText("Editar Departamento")).toBeInTheDocument();
  });

  it("campo code deshabilitado en modo edit", () => {
    render(<DepartmentEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByLabelText("Código")).toBeDisabled();
  });

  it("campos pre-rellenos con los datos del entity", () => {
    render(<DepartmentEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByLabelText("Nombre")).toHaveValue("Ventas");
  });

  it("botón Guardar deshabilitado cuando no hay diff", () => {
    render(<DepartmentEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });

  it("botón Guardar habilitado cuando hay cambios", async () => {
    render(<DepartmentEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "Ventas actualizado");
    expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();
  });

  it("onSave recibe solo el diff cuando hay cambios", async () => {
    const onSave = jest.fn();
    render(
      <DepartmentEditModal {...defaultProps} mode="edit" entity={BASE_ENTITY} onSave={onSave} />
    );
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "Ventas 2");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledWith({ name: "Ventas 2" });
  });
});
