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

jest.mock("../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../app/(private)/waybills/_logic/hooks/useWaybillsList");
jest.mock("../../../../../app/_hooks/useBranchesOptions", () => ({
  useBranchesOptions: () => ({ options: [], isLoading: false }),
}));

import { useCurrentUser } from "../../../../../app/_hooks/useCurrentUser";
import * as useWaybillsListModule from "../../../../../app/(private)/waybills/_logic/hooks/useWaybillsList";
import { WaybillsListPage } from "../../../../../app/(private)/waybills/_blocks/WaybillsListPage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

function makeCan(permissions: string[]) {
  return (perm: string): boolean | "loading" => {
    if (permissions.includes("*")) return true;
    return permissions.includes(perm);
  };
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

function setupWaybillsList(overrides = {}) {
  jest.spyOn(useWaybillsListModule, "useWaybillsList").mockReturnValue({
    items: [],
    total: 0,
    page: 1,
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    ...overrides,
  });
}

describe("WaybillsListPage — gate de permisos", () => {
  beforeEach(() => jest.clearAllMocks());

  it("can=false → muestra EmptyState 'Sin acceso'", () => {
    setupCurrentUser([]);
    setupWaybillsList();
    render(<WaybillsListPage />);
    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
  });

  it("can=loading → muestra Spinner (layout optimista)", () => {
    setupCurrentUser("loading");
    setupWaybillsList({ isLoading: true });
    const { container } = render(<WaybillsListPage />);
    expect(container.querySelector("svg, [role='progressbar'], .animate-spin")).toBeTruthy();
  });

  it("can=true → renderiza el shell con título", () => {
    setupCurrentUser(["waybills:read"]);
    setupWaybillsList();
    render(<WaybillsListPage />);
    expect(screen.getByText("Traspasos")).toBeInTheDocument();
  });

  it("error de carga → muestra EmptyState de error", () => {
    setupCurrentUser(["waybills:read"]);
    setupWaybillsList({ error: new Error("Network failure") });
    render(<WaybillsListPage />);
    expect(screen.getByText(/Error al cargar traspasos/i)).toBeInTheDocument();
  });

  it("sin items → muestra empty state de traspasos", () => {
    setupCurrentUser(["waybills:read"]);
    setupWaybillsList({ items: [], total: 0 });
    render(<WaybillsListPage />);
    expect(screen.getByText(/No hay traspasos/i)).toBeInTheDocument();
  });
});

describe("WaybillsListPage — scoping de sucursal", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sin branches:access_all → no muestra filtro Sucursal", () => {
    setupCurrentUser(["waybills:read"]);
    setupWaybillsList();
    render(<WaybillsListPage />);
    expect(screen.queryByLabelText(/Filtrar por sucursal/i)).not.toBeInTheDocument();
  });

  it("con branches:access_all → muestra filtro Sucursal", () => {
    setupCurrentUser(["waybills:read", "branches:access_all"]);
    setupWaybillsList();
    render(<WaybillsListPage />);
    expect(screen.getByLabelText(/Filtrar por sucursal/i)).toBeInTheDocument();
  });
});

describe("WaybillsListPage — CTA nuevo traspaso", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sin waybills:write → no muestra botón + Nuevo traspaso", () => {
    setupCurrentUser(["waybills:read"]);
    setupWaybillsList();
    render(<WaybillsListPage />);
    expect(screen.queryByText(/Nuevo traspaso/i)).not.toBeInTheDocument();
  });

  it("con waybills:write → muestra botón + Nuevo traspaso", () => {
    setupCurrentUser(["waybills:read", "waybills:write"]);
    setupWaybillsList();
    render(<WaybillsListPage />);
    expect(screen.getByText(/Nuevo traspaso/i)).toBeInTheDocument();
  });
});
