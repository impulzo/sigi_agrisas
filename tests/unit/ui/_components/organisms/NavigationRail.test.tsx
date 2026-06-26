/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../app/(public)/auth/_logic/hooks/useLogout", () => ({
  useLogout: jest.fn(() => ({ logout: jest.fn(), isLoading: false })),
}));
jest.mock("../../../../../app/_components/molecules/RailFlyout/RailFlyout", () => ({
  RailFlyout: () => null,
}));

import { usePathname } from "next/navigation";
import { useCurrentUser } from "../../../../../app/_hooks/useCurrentUser";
import { NavigationRail } from "../../../../../app/_components/organisms/NavigationRail/NavigationRail";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

function makeCan(permissions: string[]) {
  return (perm: string): boolean | "loading" => permissions.includes(perm);
}

function renderRail(pathname: string, permissions: string[]) {
  (usePathname as jest.Mock).mockReturnValue(pathname);
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "test@test.com",
    roles: [],
    branchId: null,
    isLoading: false,
    can: makeCan(permissions),
    refresh: jest.fn(),
  });
  return render(<NavigationRail />);
}

describe("NavigationRail — estado activo", () => {
  it("marca Dashboard activo cuando pathname es /dashboard", () => {
    renderRail("/dashboard", []);
    const dashboard = screen.getByRole("link", { name: /Inicio/ });
    expect(dashboard.className).toContain("bg-primary-container");
  });

  it("marca POS activo cuando pathname empieza con /pos", () => {
    renderRail("/pos/new", ["sales:create"]);
    const pos = screen.getByRole("link", { name: /^POS$/ });
    expect(pos.className).toContain("bg-primary-container");
  });

  it("marca Cotizaciones activo cuando pathname empieza con /quotes", () => {
    renderRail("/quotes/abc", ["quotes:read"]);
    const quotes = screen.getByRole("link", { name: /Cotizaciones/ });
    expect(quotes.className).toContain("bg-primary-container");
  });
});

describe("NavigationRail — filtrado por permisos", () => {
  it("viewer con sales:read y quotes:read ve Ventas y Cotizaciones", () => {
    renderRail("/dashboard", ["sales:read", "quotes:read"]);
    expect(screen.getByRole("link", { name: /Ventas/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cotizaciones/ })).toBeInTheDocument();
  });

  it("viewer sin quotes:read NO ve Cotizaciones", () => {
    renderRail("/dashboard", ["sales:read"]);
    expect(screen.queryByRole("link", { name: /Cotizaciones/ })).not.toBeInTheDocument();
  });

  it("operator con sales:create + sales:read + quotes:read ve POS, Ventas y Cotizaciones", () => {
    renderRail("/dashboard", ["sales:create", "sales:read", "quotes:read"]);
    expect(screen.getByRole("link", { name: /^POS$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ventas/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cotizaciones/ })).toBeInTheDocument();
  });

  it("usuario sin sales:create NO ve POS", () => {
    renderRail("/dashboard", ["sales:read", "quotes:read"]);
    expect(screen.queryByRole("link", { name: /^POS$/ })).not.toBeInTheDocument();
  });

  it("Dashboard siempre visible (sin requires)", () => {
    renderRail("/dashboard", []);
    expect(screen.getByRole("link", { name: /Inicio/ })).toBeInTheDocument();
  });

  it('muestra ítem optimistamente cuando can() devuelve "loading"', () => {
    (usePathname as jest.Mock).mockReturnValue("/dashboard");
    mockUseCurrentUser.mockReturnValue({
      userId: "u1",
      email: "test@test.com",
      roles: [],
      branchId: null,
      isLoading: true,
      can: () => "loading",
      refresh: jest.fn(),
    });
    render(<NavigationRail />);
    expect(screen.getByRole("link", { name: /Cotizaciones/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^POS$/ })).toBeInTheDocument();
  });
});

describe("NavigationRail — hrefs", () => {
  it("Cotizaciones apunta a /quotes", () => {
    renderRail("/dashboard", ["quotes:read"]);
    expect(screen.getByRole("link", { name: /Cotizaciones/ })).toHaveAttribute("href", "/quotes");
  });

  it("Ventas apunta a /sales", () => {
    renderRail("/dashboard", ["sales:read"]);
    expect(screen.getByRole("link", { name: /Ventas/ })).toHaveAttribute("href", "/sales");
  });
});

describe("NavigationRail — item Devoluciones", () => {
  it("usuario con returns:read ve el item Devoluciones", () => {
    renderRail("/dashboard", ["returns:read"]);
    expect(screen.getByRole("link", { name: /Devoluciones/ })).toBeInTheDocument();
  });

  it("usuario sin returns:read NO ve el item Devoluciones", () => {
    renderRail("/dashboard", ["sales:read"]);
    expect(screen.queryByRole("link", { name: /Devoluciones/ })).not.toBeInTheDocument();
  });

  it("Devoluciones aparece entre Cotizaciones e Inventario", () => {
    renderRail("/dashboard", ["returns:read", "quotes:read", "inventory:read"]);
    const links = screen.getAllByRole("link");
    const names = links.map((l) => l.textContent?.trim());
    const quotesIdx = names.findIndex((n) => n?.includes("Cotizaciones"));
    const returnsIdx = names.findIndex((n) => n?.includes("Devoluciones"));
    const inventoryIdx = names.findIndex((n) => n?.includes("Inventario"));
    expect(quotesIdx).toBeLessThan(returnsIdx);
    expect(returnsIdx).toBeLessThan(inventoryIdx);
  });

  it("Devoluciones activo cuando pathname empieza con /returns/", () => {
    renderRail("/returns/abc-123", ["returns:read"]);
    const link = screen.getByRole("link", { name: /Devoluciones/ });
    expect(link.className).toContain("bg-primary-container");
  });
});

describe("NavigationRail — scroll structure", () => {
  it("nav scrolleable tiene overflow-y-auto y scrollbar-thin", () => {
    renderRail("/dashboard", []);
    const nav = screen.getByRole("navigation", { name: /Primary/ });
    expect(nav.className).toContain("overflow-y-auto");
    expect(nav.className).toContain("scrollbar-thin");
  });

  it("botón de logout está en el DOM (footer fijo)", () => {
    renderRail("/dashboard", []);
    expect(screen.getByRole("button", { name: /Cerrar sesión/ })).toBeInTheDocument();
  });
});
