/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../../../../app/(private)/account/_logic/hooks/useOwnProfile");
jest.mock("../../../../../app/_components/organisms/PageShell", () => ({
  PageShell: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));
jest.mock("../../../../../app/(private)/account/_blocks/ProfileForm", () => ({
  ProfileForm: () => <div data-testid="profile-form" />,
}));
jest.mock("../../../../../app/(private)/account/_blocks/SendPasswordLinkCard", () => ({
  SendPasswordLinkCard: () => <div data-testid="password-link-card" />,
}));

import { useOwnProfile } from "../../../../../app/(private)/account/_logic/hooks/useOwnProfile";
import { AccountPage } from "../../../../../app/(private)/account/_blocks/AccountPage";

const mockUseOwnProfile = useOwnProfile as jest.MockedFunction<typeof useOwnProfile>;

const profile = {
  id: "uid-1",
  name: "Usuario",
  email: "user@example.com",
  avatarUrl: "https://www.gravatar.com/avatar/abc?d=mp&s=200",
};

describe("AccountPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("muestra el spinner de carga en el bloque de perfil, sin bloquear el cambio de contraseña", () => {
    mockUseOwnProfile.mockReturnValue({
      profile: null,
      isLoading: true,
      error: null,
      refresh: jest.fn(),
    });
    render(<AccountPage />);

    expect(screen.queryByTestId("profile-form")).not.toBeInTheDocument();
    // SendPasswordLinkCard es independiente del perfil — se monta siempre.
    expect(screen.getByTestId("password-link-card")).toBeInTheDocument();
  });

  it("muestra el detalle real del error y un botón Reintentar, sin ocultar el cambio de contraseña", () => {
    const refresh = jest.fn();
    mockUseOwnProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      error: new Error("Usuario no encontrado"),
      refresh,
    });
    render(<AccountPage />);

    expect(screen.getByText("Usuario no encontrado")).toBeInTheDocument();
    expect(screen.queryByTestId("profile-form")).not.toBeInTheDocument();
    // SendPasswordLinkCard es independiente del perfil — debe seguir visible ante error.
    expect(screen.getByTestId("password-link-card")).toBeInTheDocument();
  });

  it("el botón Reintentar dispara refresh()", async () => {
    const refresh = jest.fn();
    mockUseOwnProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      error: new Error("Error de red"),
      refresh,
    });
    render(<AccountPage />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /reintentar/i }));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("renderiza ProfileForm y SendPasswordLinkCard cuando el perfil carga correctamente", () => {
    mockUseOwnProfile.mockReturnValue({
      profile,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<AccountPage />);

    expect(screen.getByTestId("profile-form")).toBeInTheDocument();
    expect(screen.getByTestId("password-link-card")).toBeInTheDocument();
  });
});
