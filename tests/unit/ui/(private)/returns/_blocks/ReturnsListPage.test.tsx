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
jest.mock("../../../../../../app/(private)/returns/_logic/hooks/useReturnsList");
jest.mock("../../../../../../app/(private)/inventory/_logic/hooks/useBranchesOptions", () => ({
  useBranchesOptions: () => ({ options: [], isLoading: false }),
}));

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import * as useReturnsListModule from "../../../../../../app/(private)/returns/_logic/hooks/useReturnsList";
import { ReturnsListPage } from "../../../../../../app/(private)/returns/_blocks/ReturnsListPage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

function makeCan(permissions: string[]) {
  return (perm: string): boolean | "loading" => {
    if (permissions.includes("*")) return true;
    return permissions.includes(perm);
  };
}

function setupCurrentUser(permissions: string[] | "loading") {
  const canFn = permissions === "loading"
    ? () => "loading" as const
    : makeCan(permissions);

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

function setupReturnsList(overrides = {}) {
  jest.spyOn(useReturnsListModule, "useReturnsList").mockReturnValue({
    items: [],
    total: 0,
    page: 1,
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    ...overrides,
  });
}

describe("ReturnsListPage — gate de permisos", () => {
  beforeEach(() => jest.clearAllMocks());

  it("can=false → muestra EmptyState 'Sin acceso'", () => {
    setupCurrentUser([]);
    setupReturnsList();
    render(<ReturnsListPage />);
    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
  });

  it("can=loading → muestra Spinner (layout optimista)", () => {
    setupCurrentUser("loading");
    setupReturnsList({ isLoading: true });
    const { container } = render(<ReturnsListPage />);
    expect(container.querySelector("svg, [role='progressbar'], .animate-spin")).toBeTruthy();
  });

  it("can=true → renderiza el shell con título", () => {
    setupCurrentUser(["returns:read"]);
    setupReturnsList();
    render(<ReturnsListPage />);
    expect(screen.getByText("Devoluciones")).toBeInTheDocument();
  });

  it("error de carga → muestra EmptyState de error", () => {
    setupCurrentUser(["returns:read"]);
    setupReturnsList({ error: new Error("Network failure") });
    render(<ReturnsListPage />);
    expect(screen.getByText(/Error al cargar devoluciones/i)).toBeInTheDocument();
  });

  it("sin items → muestra empty state de devoluciones", () => {
    setupCurrentUser(["returns:read"]);
    setupReturnsList({ items: [], total: 0 });
    render(<ReturnsListPage />);
    expect(screen.getByText(/No hay devoluciones/i)).toBeInTheDocument();
  });
});

describe("ReturnsListPage — scoping de sucursal", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sin branches:access_all → no muestra filtro Sucursal", () => {
    setupCurrentUser(["returns:read"]);
    setupReturnsList();
    render(<ReturnsListPage />);
    expect(screen.queryByText(/Sucursal/i)).not.toBeInTheDocument();
  });

  it("con branches:access_all → muestra filtro Sucursal", () => {
    setupCurrentUser(["returns:read", "branches:access_all"]);
    setupReturnsList();
    render(<ReturnsListPage />);
    expect(screen.getByText(/Sucursal/i)).toBeInTheDocument();
  });
});
