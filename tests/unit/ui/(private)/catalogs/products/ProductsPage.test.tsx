/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("../../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../../app/(private)/catalogs/products/_logic/hooks/useProducts");
jest.mock("../../../../../../app/(private)/catalogs/products/_logic/hooks/useProductMutations");
jest.mock("../../../../../../app/_hooks/useDepartmentsOptions");
jest.mock("../../../../../../app/_hooks/useProvidersOptions");
jest.mock("../../../../../../app/_hooks/useInventoryScopeMode");

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import * as useProductsModule from "../../../../../../app/(private)/catalogs/products/_logic/hooks/useProducts";
import * as useProductMutationsModule from "../../../../../../app/(private)/catalogs/products/_logic/hooks/useProductMutations";
import * as useDepartmentsOptionsModule from "../../../../../../app/_hooks/useDepartmentsOptions";
import * as useProvidersOptionsModule from "../../../../../../app/_hooks/useProvidersOptions";
import * as useInventoryScopeModeModule from "../../../../../../app/_hooks/useInventoryScopeMode";
import { ProductsPage } from "../../../../../../app/(private)/catalogs/products/_blocks/ProductsPage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

function setup(mode: "general" | "branch") {
  mockUseCurrentUser.mockReturnValue({
    userId: "u1", email: "test@test.com", roles: [], branchId: null, isLoading: false,
    can: () => true, refresh: jest.fn(),
  });
  jest.spyOn(useProductsModule, "useProducts").mockReturnValue({
    items: [], total: 0, isLoading: false, error: null, refresh: jest.fn(),
  });
  jest.spyOn(useProductMutationsModule, "useProductMutations").mockReturnValue({
    isSaving: false, error: null, clearError: jest.fn(),
    createOne: jest.fn(), updateOne: jest.fn(), softDeleteOne: jest.fn(), reactivateOne: jest.fn(),
  });
  jest.spyOn(useDepartmentsOptionsModule, "useDepartmentsOptions").mockReturnValue({ options: [], isLoading: false });
  jest.spyOn(useProvidersOptionsModule, "useProvidersOptions").mockReturnValue({ options: [], isLoading: false });
  jest.spyOn(useInventoryScopeModeModule, "useInventoryScopeMode").mockReturnValue({ mode, isLoading: false, refresh: jest.fn() });
}

describe("ProductsPage — nota de modo de inventario por sucursal", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra la nota informativa cuando el modo es branch", () => {
    setup("branch");
    render(<ProductsPage />);
    expect(screen.getByText(/deben asignarse a cada sucursal desde Inventario/i)).toBeInTheDocument();
  });

  it("no muestra la nota cuando el modo es general", () => {
    setup("general");
    render(<ProductsPage />);
    expect(screen.queryByText(/deben asignarse a cada sucursal desde Inventario/i)).not.toBeInTheDocument();
  });
});
