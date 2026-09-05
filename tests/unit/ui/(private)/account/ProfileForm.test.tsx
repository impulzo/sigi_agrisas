/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProfileForm } from "../../../../../app/(private)/account/_blocks/ProfileForm";
import type { OwnProfileDto } from "../../../../../app/(private)/account/_logic/types/api";

const profile: OwnProfileDto = {
  id: "uid-1",
  name: "Usuario Original",
  email: "original@example.com",
  avatarUrl: "https://www.gravatar.com/avatar/abc?d=mp&s=200",
};

function baseProps(overrides?: Partial<React.ComponentProps<typeof ProfileForm>>) {
  return {
    profile,
    onChange: jest.fn(),
    isSavingProfile: false,
    profileError: null,
    profileFieldErrors: {},
    clearProfileError: jest.fn(),
    saveProfileDiff: jest.fn().mockResolvedValue(profile),
    ...overrides,
  };
}

describe("ProfileForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deshabilita guardar cuando no hay cambios (diff-gated)", () => {
    render(<ProfileForm {...baseProps()} />);

    expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeDisabled();
  });

  it("habilita guardar y envía sólo los campos modificados", async () => {
    const saveProfileDiff = jest.fn().mockResolvedValue(profile);
    render(<ProfileForm {...baseProps({ saveProfileDiff })} />);

    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), "Nuevo Nombre");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(saveProfileDiff).toHaveBeenCalledWith({
      original: profile,
      edited: { name: "Nuevo Nombre", email: profile.email },
    });
  });

  it("muestra error de validación inline y deshabilita guardar con correo inválido", async () => {
    render(<ProfileForm {...baseProps()} />);

    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/correo/i));
    await user.type(screen.getByLabelText(/correo/i), "no-es-un-correo");

    expect(screen.getByText(/correo inválido/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeDisabled();
  });

  it("muestra el error genérico devuelto por el hook en el banner", () => {
    render(<ProfileForm {...baseProps({ profileError: "Error al guardar el perfil" })} />);

    expect(screen.getByText(/error al guardar el perfil/i)).toBeInTheDocument();
  });

  it("muestra el error 409 (correo duplicado) inline en el campo correo", () => {
    render(
      <ProfileForm
        {...baseProps({ profileFieldErrors: { email: "El correo ya está en uso por otra cuenta" } })}
      />
    );

    expect(screen.getByText(/el correo ya está en uso por otra cuenta/i)).toBeInTheDocument();
  });

  it("limpia el error 409 del campo correo al editarlo de nuevo", async () => {
    const clearProfileError = jest.fn();
    render(
      <ProfileForm
        {...baseProps({
          profileFieldErrors: { email: "El correo ya está en uso por otra cuenta" },
          clearProfileError,
        })}
      />
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/correo/i), "x");

    expect(clearProfileError).toHaveBeenCalled();
  });

  it("maneja profile.name undefined como campo vacío, sin romper", async () => {
    const saveProfileDiff = jest.fn().mockResolvedValue(profile);
    const profileWithoutName: OwnProfileDto = { ...profile, name: undefined };
    render(<ProfileForm {...baseProps({ profile: profileWithoutName, saveProfileDiff })} />);

    expect(screen.getByLabelText(/nombre/i)).toHaveValue("");
    expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeDisabled();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/nombre/i), "Nombre Nuevo");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(saveProfileDiff).toHaveBeenCalledWith({
      original: profileWithoutName,
      edited: { name: "Nombre Nuevo", email: profile.email },
    });
  });
});
