import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserEditModal } from "../../../../../app/(private)/users/_blocks/UserEditModal";
import type { User } from "../../../../../app/(private)/users/_logic/types/domain";

const USER: User = {
  id: "u1",
  name: "Alice",
  email: "alice@test.com",
  avatarUrl: "https://gravatar.com/avatar/abc",
  roles: ["viewer"],
  createdAt: new Date(),
  updatedAt: new Date(),
};
const CATALOG = [
  { id: "r1", name: "admin" },
  { id: "r2", name: "viewer" },
];

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn(function(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = jest.fn(function(this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

describe("UserEditModal", () => {
  function setup(overrides?: Partial<React.ComponentProps<typeof UserEditModal>>) {
    const props = {
      open: true,
      user: USER,
      catalog: CATALOG,
      catalogLoading: false,
      isSaving: false,
      mutationError: null,
      onSave: jest.fn(),
      onClose: jest.fn(),
      ...overrides,
    };
    render(<UserEditModal {...props} />);
    return props;
  }

  it("pre-llena nombre y email con datos del usuario", () => {
    setup();
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Alice");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("alice@test.com");
  });

  it("marca el rol actual del usuario en la lista", () => {
    setup();
    const viewerCheckbox = screen.getByRole("checkbox", { name: "viewer" });
    expect(viewerCheckbox).toBeChecked();
    const adminCheckbox = screen.getByRole("checkbox", { name: "admin" });
    expect(adminCheckbox).not.toBeChecked();
  });

  it("Guardar Cambios deshabilitado si no hay cambios", () => {
    setup();
    expect(screen.getByRole("button", { name: "Guardar Cambios" })).toBeDisabled();
  });

  it("habilita Guardar al cambiar nombre", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Nuevo Nombre" } });
    expect(screen.getByRole("button", { name: "Guardar Cambios" })).not.toBeDisabled();
  });

  it("muestra error de validación para email inválido", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "no-email" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }));
    expect(screen.getByText("Email inválido")).toBeInTheDocument();
  });

  it("resetear a Gravatar limpia el input de avatar", () => {
    setup();
    const resetBtn = screen.getByText("Resetear a Gravatar");
    fireEvent.click(resetBtn);
    const avatarInput = screen.getByPlaceholderText("https://example.com/photo.jpg") as HTMLInputElement;
    expect(avatarInput.value).toBe("");
  });

  it("muestra mutationError cuando está presente", () => {
    setup({ mutationError: "Ese email ya está en uso" });
    expect(screen.getByText("Ese email ya está en uso")).toBeInTheDocument();
  });

  it("botón Cancelar llama onClose", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("dispara onSave con el diff cuando se guarda", () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Nuevo" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Nuevo", email: "alice@test.com" })
    );
  });
});
