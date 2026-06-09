import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../app/(private)/users/_logic/hooks/useUsers");
jest.mock("../../../../../app/(private)/users/_logic/hooks/useRolesCatalog");
jest.mock("../../../../../app/(private)/users/_logic/hooks/useUserMutations");

import { useCurrentUser } from "../../../../../app/_hooks/useCurrentUser";
import * as useUsersModule from "../../../../../app/(private)/users/_logic/hooks/useUsers";
import * as useRolesCatalogModule from "../../../../../app/(private)/users/_logic/hooks/useRolesCatalog";
import * as useUserMutationsModule from "../../../../../app/(private)/users/_logic/hooks/useUserMutations";
import { UsersPage } from "../../../../../app/(private)/users/_blocks/UsersPage";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn();
  HTMLDialogElement.prototype.close = jest.fn();
});

const mockCan = jest.fn();
(useCurrentUser as jest.MockedFunction<typeof useCurrentUser>).mockReturnValue({
  userId: "admin-id",
  email: "admin@test.com",
  roles: ["admin"],
  branchId: null,
  isLoading: false,
  can: mockCan,
  refresh: jest.fn(),
});

jest.spyOn(useRolesCatalogModule, "useRolesCatalog").mockReturnValue({ roles: [], isLoading: false, error: null });
jest.spyOn(useUserMutationsModule, "useUserMutations").mockReturnValue({
  isSaving: false,
  mutationError: null,
  clearError: jest.fn(),
  saveUserDiff: jest.fn(),
  removeUser: jest.fn(),
});

describe("UsersPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra esqueletos cuando can=loading", () => {
    mockCan.mockReturnValue("loading");
    jest.spyOn(useUsersModule, "useUsers").mockReturnValue({ users: [], total: 0, isLoading: false, error: null, refresh: jest.fn() });
    const { container } = render(<UsersPage />);
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
  });

  it("muestra EmptyState Sin acceso cuando can=false", () => {
    mockCan.mockReturnValue(false);
    jest.spyOn(useUsersModule, "useUsers").mockReturnValue({ users: [], total: 0, isLoading: false, error: null, refresh: jest.fn() });
    render(<UsersPage />);
    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
  });

  it("muestra tabla cuando can=true y hay usuarios", () => {
    mockCan.mockReturnValue(true);
    jest.spyOn(useUsersModule, "useUsers").mockReturnValue({
      users: [{ id: "u1", name: "Alice", email: "a@test.com", avatarUrl: "https://g.com/a", roles: ["admin"], createdAt: new Date(), updatedAt: new Date() }],
      total: 1,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<UsersPage />);
    expect(screen.getByText("Administración de Usuarios")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("muestra UsersError cuando hay error de carga", () => {
    mockCan.mockReturnValue(true);
    jest.spyOn(useUsersModule, "useUsers").mockReturnValue({ users: [], total: 0, isLoading: false, error: "Net error", refresh: jest.fn() });
    render(<UsersPage />);
    expect(screen.getByText("No se pudo cargar la lista de usuarios")).toBeInTheDocument();
  });
});
