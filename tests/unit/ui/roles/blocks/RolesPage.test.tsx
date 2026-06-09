import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { RolesPage } from "../../../../../app/(private)/roles/_blocks/RolesPage";

jest.mock("../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../app/(private)/roles/_logic/services/listRoles");
jest.mock("../../../../../app/(private)/roles/_logic/services/listPermissions");
jest.mock("../../../../../app/(private)/roles/_logic/services/listRolePermissions");
jest.mock("../../../../../app/(private)/roles/_logic/services/grantPermissionToRole");
jest.mock("../../../../../app/(private)/roles/_logic/services/revokePermissionFromRole");

import { useCurrentUser } from "../../../../../app/_hooks/useCurrentUser";
import { listRoles } from "../../../../../app/(private)/roles/_logic/services/listRoles";
import { listPermissions } from "../../../../../app/(private)/roles/_logic/services/listPermissions";
import { listRolePermissions } from "../../../../../app/(private)/roles/_logic/services/listRolePermissions";
import { grantPermissionToRole } from "../../../../../app/(private)/roles/_logic/services/grantPermissionToRole";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockListRoles = listRoles as jest.MockedFunction<typeof listRoles>;
const mockListPermissions = listPermissions as jest.MockedFunction<typeof listPermissions>;
const mockListRolePermissions = listRolePermissions as jest.MockedFunction<typeof listRolePermissions>;
const mockGrant = grantPermissionToRole as jest.MockedFunction<typeof grantPermissionToRole>;

const fakeRoles = [
  { id: "r1", name: "admin", description: "Admin", createdAt: "", updatedAt: "" },
];
const fakeAssigned = [{ id: "p1", key: "users:read", description: "Leer usuarios" }];
const fakeCatalog = [
  { id: "p1", key: "users:read", description: "Leer usuarios" },
  { id: "p2", key: "roles:write", description: "Gestionar roles" },
];

function setupAuth(canResult: boolean | "loading" = true) {
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "a@b.com",
    roles: ["admin"],
    isLoading: false,
    branchId: null,
    can: () => canResult,
    refresh: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListRoles.mockResolvedValue(fakeRoles);
  mockListPermissions.mockResolvedValue(fakeCatalog);
  mockListRolePermissions.mockResolvedValue(fakeAssigned);
  mockGrant.mockResolvedValue(undefined);
});

describe("RolesPage", () => {
  it("renders EmptyState with 'Sin acceso' when can('roles:read') is false", async () => {
    setupAuth(false);
    render(<RolesPage />);
    await waitFor(() => expect(screen.getByText("Sin acceso")).toBeInTheDocument());
  });

  it("renders roles list when can resolves true", async () => {
    setupAuth(true);
    render(<RolesPage />);
    await waitFor(() => {
      const elements = screen.getAllByText("admin");
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("Guardar Cambios is disabled initially and enabled after toggling a permission", async () => {
    setupAuth(true);
    render(<RolesPage />);

    const toggle = await waitFor(() =>
      screen.getByRole("switch", { name: "Conceder Gestionar roles" })
    );
    expect(screen.getByRole("button", { name: "Guardar Cambios" })).toBeDisabled();

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "Guardar Cambios" })).not.toBeDisabled();
  });

  it("calls grantPermissionToRole when Guardar Cambios is clicked", async () => {
    setupAuth(true);
    render(<RolesPage />);

    const toggle = await waitFor(() =>
      screen.getByRole("switch", { name: "Conceder Gestionar roles" })
    );
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    await waitFor(() =>
      expect(mockGrant).toHaveBeenCalledWith("r1", "roles:write")
    );
  });

  it("shows error message when save fails", async () => {
    setupAuth(true);
    mockGrant.mockRejectedValueOnce(new Error("Error del servidor"));
    render(<RolesPage />);

    const toggle = await waitFor(() =>
      screen.getByRole("switch", { name: "Conceder Gestionar roles" })
    );
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    await waitFor(() =>
      expect(screen.getByText("Error del servidor")).toBeInTheDocument()
    );
  });

  it("Descartar reverts staged changes", async () => {
    setupAuth(true);
    render(<RolesPage />);

    const toggle = await waitFor(() =>
      screen.getByRole("switch", { name: "Conceder Gestionar roles" })
    );
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Guardar Cambios" })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));

    expect(screen.getByRole("button", { name: "Guardar Cambios" })).toBeDisabled();
  });
});
