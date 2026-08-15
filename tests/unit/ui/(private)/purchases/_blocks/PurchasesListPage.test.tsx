/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => {
  const Link = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("../../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../../app/(private)/purchases/_logic/hooks/usePurchasesList");
jest.mock("../../../../../../app/(private)/purchases/_logic/hooks/useProviderSearch", () => ({
  useProviderSearch: () => ({ items: [], total: 0, isLoading: false, error: null, refresh: jest.fn() }),
}));
jest.mock("../../../../../../app/_hooks/useBranchesOptions", () => ({
  useBranchesOptions: () => ({ options: [], isLoading: false }),
}));

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import * as usePurchasesListModule from "../../../../../../app/(private)/purchases/_logic/hooks/usePurchasesList";
import { PurchasesListPage } from "../../../../../../app/(private)/purchases/_blocks/PurchasesListPage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

function makeCan(permissions: string[]) {
  return (perm: string): boolean | "loading" => permissions.includes(perm);
}

function setupCurrentUser(permissions: string[] | "loading") {
  const canFn = permissions === "loading" ? () => "loading" as const : makeCan(permissions);
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "test@test.com",
    roles: [],
    branchId: null,
    isLoading: permissions === "loading",
    can: canFn,
    refresh: jest.fn(),
  });
}

function setupPurchasesList(overrides = {}) {
  jest.spyOn(usePurchasesListModule, "usePurchasesList").mockReturnValue({
    items: [],
    total: 0,
    page: 1,
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    ...overrides,
  });
}

describe("PurchasesListPage — gate de permisos", () => {
  beforeEach(() => jest.clearAllMocks());

  it("can=false → muestra EmptyState 'Sin acceso'", () => {
    setupCurrentUser([]);
    setupPurchasesList();
    render(<PurchasesListPage />);
    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
  });

  it("can=true → renderiza el shell con título Compras", () => {
    setupCurrentUser(["purchases:read"]);
    setupPurchasesList();
    render(<PurchasesListPage />);
    expect(screen.getByText("Compras")).toBeInTheDocument();
  });

  it("error de carga → muestra EmptyState de error", () => {
    setupCurrentUser(["purchases:read"]);
    setupPurchasesList({ error: new Error("Network failure") });
    render(<PurchasesListPage />);
    expect(screen.getByText(/Error al cargar compras/i)).toBeInTheDocument();
  });

  it("sin items → muestra empty state de compras", () => {
    setupCurrentUser(["purchases:read"]);
    setupPurchasesList({ items: [], total: 0 });
    render(<PurchasesListPage />);
    expect(screen.getByText(/No hay compras/i)).toBeInTheDocument();
  });
});

describe("PurchasesListPage — scoping de sucursal", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sin branches:access_all → no muestra filtro Sucursal", () => {
    setupCurrentUser(["purchases:read"]);
    setupPurchasesList();
    render(<PurchasesListPage />);
    expect(screen.queryByLabelText(/Filtrar por sucursal/i)).not.toBeInTheDocument();
  });

  it("con branches:access_all → muestra filtro Sucursal", () => {
    setupCurrentUser(["purchases:read", "branches:access_all"]);
    setupPurchasesList();
    render(<PurchasesListPage />);
    expect(screen.getByLabelText(/Filtrar por sucursal/i)).toBeInTheDocument();
  });
});

describe("PurchasesListPage — CTA Nueva compra", () => {
  beforeEach(() => jest.clearAllMocks());

  it("con purchases:create → muestra link a /purchases/new", () => {
    setupCurrentUser(["purchases:read", "purchases:create"]);
    setupPurchasesList();
    render(<PurchasesListPage />);
    const link = screen.getByRole("link", { name: /Nueva compra/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/purchases/new");
  });

  it("sin purchases:create → no muestra el link", () => {
    setupCurrentUser(["purchases:read"]);
    setupPurchasesList();
    render(<PurchasesListPage />);
    expect(screen.queryByRole("link", { name: /Nueva compra/i })).not.toBeInTheDocument();
  });
});
