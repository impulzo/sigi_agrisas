/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../app/(private)/inventory/_logic/hooks/useBranchInventory");
jest.mock("../../../../../app/(private)/inventory/_logic/hooks/useBranchesOptions");
jest.mock("../../../../../app/(private)/inventory/_logic/hooks/useInventoryMutations");

import { useCurrentUser } from "../../../../../app/_hooks/useCurrentUser";
import * as useBranchInventoryModule from "../../../../../app/(private)/inventory/_logic/hooks/useBranchInventory";
import * as useBranchesOptionsModule from "../../../../../app/(private)/inventory/_logic/hooks/useBranchesOptions";
import * as useInventoryMutationsModule from "../../../../../app/(private)/inventory/_logic/hooks/useInventoryMutations";
import { InventoryPage } from "../../../../../app/(private)/inventory/_blocks/InventoryPage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

function makeCan(permissions: string[]) {
  return (perm: string): boolean | "loading" => permissions.includes(perm);
}

function setupCurrentUser(permissions: string[], branchId: string | null) {
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "test@test.com",
    roles: [],
    branchId,
    isLoading: false,
    can: makeCan(permissions),
    refresh: jest.fn(),
  });
}

function setupBranchInventory(overrides = {}) {
  jest.spyOn(useBranchInventoryModule, "useBranchInventory").mockReturnValue({
    items: [],
    total: 0,
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    ...overrides,
  });
}

function setupBranchesOptions(options: { id: string; name: string }[] = []) {
  jest.spyOn(useBranchesOptionsModule, "useBranchesOptions").mockReturnValue({
    options,
    isLoading: false,
  });
}

function setupInventoryMutations() {
  jest.spyOn(useInventoryMutationsModule, "useInventoryMutations").mockReturnValue({
    isSaving: false,
    mutationError: null,
    clearError: jest.fn(),
    assignOne: jest.fn(),
    updateOne: jest.fn(),
    adjustOne: jest.fn(),
    removeOne: jest.fn(),
  });
}

describe("InventoryPage — gating del selector de sucursal", () => {
  beforeEach(() => jest.clearAllMocks());

  it("operador con sucursal asignada → sin select, carga directo su stock", () => {
    setupCurrentUser(["inventory:read"], "branch-1");
    setupBranchesOptions([{ id: "branch-1", name: "Sucursal Centro" }]);
    const useBranchInventorySpy = jest.spyOn(useBranchInventoryModule, "useBranchInventory");
    setupBranchInventory();
    setupInventoryMutations();

    render(<InventoryPage />);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("Sucursal Centro")).toBeInTheDocument();
    expect(useBranchInventorySpy).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: "branch-1" })
    );
  });

  it("operador sin sucursal asignada → EmptyState 'Sin sucursal asignada'", () => {
    setupCurrentUser(["inventory:read"], null);
    setupBranchesOptions([]);
    setupBranchInventory();
    setupInventoryMutations();

    render(<InventoryPage />);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("Sin sucursal asignada")).toBeInTheDocument();
  });

  it("admin con branches:access_all → select visible, comportamiento sin cambios", () => {
    setupCurrentUser(["inventory:read", "branches:access_all"], null);
    setupBranchesOptions([
      { id: "branch-1", name: "Sucursal Centro" },
      { id: "branch-2", name: "Sucursal Norte" },
    ]);
    setupBranchInventory();
    setupInventoryMutations();

    render(<InventoryPage />);

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Selecciona una sucursal" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sucursal Norte" })).toBeInTheDocument();
  });

  it("sin inventory:read → EmptyState 'Sin acceso'", () => {
    setupCurrentUser([], "branch-1");
    setupBranchesOptions([]);
    setupBranchInventory();
    setupInventoryMutations();

    render(<InventoryPage />);

    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
  });
});
