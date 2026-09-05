/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SendPasswordLinkCard } from "../../../../../app/(private)/account/_blocks/SendPasswordLinkCard";

function baseProps(overrides?: Partial<React.ComponentProps<typeof SendPasswordLinkCard>>) {
  return {
    isSendingPasswordLink: false,
    passwordLinkError: null,
    passwordLinkSentTo: null,
    sendPasswordLink: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("SendPasswordLinkCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("dispara sendPasswordLink al hacer click en el botón", async () => {
    const sendPasswordLink = jest.fn().mockResolvedValue(true);
    render(<SendPasswordLinkCard {...baseProps({ sendPasswordLink })} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /enviarme link de cambio de contraseña/i }));

    expect(sendPasswordLink).toHaveBeenCalledTimes(1);
  });

  it("muestra el correo destino cuando el envío fue exitoso", () => {
    render(<SendPasswordLinkCard {...baseProps({ passwordLinkSentTo: "user@example.com" })} />);

    expect(screen.getByText(/enviamos el enlace a user@example\.com/i)).toBeInTheDocument();
  });

  it("muestra el error inline cuando el envío falla", () => {
    render(
      <SendPasswordLinkCard
        {...baseProps({ passwordLinkError: "No se pudo enviar el correo de cambio de contraseña." })}
      />
    );

    expect(
      screen.getByText(/no se pudo enviar el correo de cambio de contraseña/i)
    ).toBeInTheDocument();
  });

  it("muestra el error de rate limit inline cuando el usuario pide el enlace demasiado seguido", () => {
    render(
      <SendPasswordLinkCard
        {...baseProps({ passwordLinkError: "Espera 45 segundos antes de solicitar otro enlace." })}
      />
    );

    expect(screen.getByText(/espera 45 segundos antes de solicitar otro enlace/i)).toBeInTheDocument();
  });
});
