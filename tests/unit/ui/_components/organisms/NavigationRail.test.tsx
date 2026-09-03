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
jest.mock("../../../../../app/_hooks/useLogout", () => ({
  useLogout: jest.fn(() => ({ logout: jest.fn(), isLoading: false })),
}));
jest.mock("../../../../../app/_components/molecules/RailFlyout/RailFlyout", () => ({
  RailFlyout: jest.fn(() => null),
}));

import { usePathname } from "next/navigation";
import { useCurrentUser } from "../../../../../app/_hooks/useCurrentUser";
import { NavigationRail } from "../../../../../app/_components/organisms/NavigationRail/NavigationRail";
import { RailFlyout } from "../../../../../app/_components/molecules/RailFlyout/RailFlyout";

const mockRailFlyout = RailFlyout as jest.MockedFunction<typeof RailFlyout>;

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

describe("NavigationRail — item Compras", () => {
  it("usuario con purchases:read ve el item Compras", () => {
    renderRail("/dashboard", ["purchases:read"]);
    expect(screen.getByRole("link", { name: /Compras/ })).toBeInTheDocument();
  });

  it("usuario sin purchases:read NO ve el item Compras", () => {
    renderRail("/dashboard", ["sales:read"]);
    expect(screen.queryByRole("link", { name: /Compras/ })).not.toBeInTheDocument();
  });

  it('muestra Compras optimistamente cuando can() devuelve "loading"', () => {
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
    expect(screen.getByRole("link", { name: /Compras/ })).toBeInTheDocument();
  });

  it("Compras aparece entre Abonos y Facturación", () => {
    renderRail("/dashboard", ["purchases:read", "payments:read", "billing:read"]);
    const links = screen.getAllByRole("link");
    const names = links.map((l) => l.textContent?.trim());
    const paymentsIdx = names.findIndex((n) => n?.includes("Abonos"));
    const purchasesIdx = names.findIndex((n) => n?.includes("Compras"));
    const billingIdx = names.findIndex((n) => n?.includes("Facturación"));
    expect(paymentsIdx).toBeLessThan(purchasesIdx);
    expect(purchasesIdx).toBeLessThan(billingIdx);
  });

  it("Compras apunta a /purchases", () => {
    renderRail("/dashboard", ["purchases:read"]);
    expect(screen.getByRole("link", { name: /Compras/ })).toHaveAttribute("href", "/purchases");
  });
});

describe("NavigationRail — item Configuración (secondaryItems)", () => {
  it("usuario con settings:read ve el item Configuración", () => {
    renderRail("/dashboard", ["settings:read"]);
    expect(screen.getByRole("link", { name: /Configuración/ })).toBeInTheDocument();
  });

  it("usuario sin settings:read NO ve el item Configuración", () => {
    renderRail("/dashboard", ["sales:read"]);
    expect(screen.queryByRole("link", { name: /Configuración/ })).not.toBeInTheDocument();
  });

  it('muestra Configuración optimistamente cuando can() devuelve "loading"', () => {
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
    expect(screen.getByRole("link", { name: /Configuración/ })).toBeInTheDocument();
  });

  it("Configuración apunta a /settings", () => {
    renderRail("/dashboard", ["settings:read"]);
    expect(screen.getByRole("link", { name: /Configuración/ })).toHaveAttribute("href", "/settings");
  });

  it("Configuración activo cuando pathname empieza con /settings", () => {
    renderRail("/settings", ["settings:read"]);
    const link = screen.getByRole("link", { name: /Configuración/ });
    expect(link.className).toContain("bg-primary-container");
  });
});

describe("NavigationRail — children Vehículos y Operadores bajo Catálogos", () => {
  beforeEach(() => jest.clearAllMocks());

  it("usuario con vehicles:read ve el botón Catálogos y 'vehicles' entre los children visibles", () => {
    renderRail("/dashboard", ["vehicles:read"]);
    expect(screen.getByRole("button", { name: /Catálogos/ })).toBeInTheDocument();
    const lastCall = mockRailFlyout.mock.calls.at(-1)![0];
    expect(lastCall.items.map((i: { key: string }) => i.key)).toContain("vehicles");
    expect(lastCall.items.map((i: { key: string }) => i.key)).not.toContain("drivers");
  });

  it("usuario con drivers:read ve 'drivers' entre los children visibles", () => {
    renderRail("/dashboard", ["drivers:read"]);
    const lastCall = mockRailFlyout.mock.calls.at(-1)![0];
    expect(lastCall.items.map((i: { key: string }) => i.key)).toContain("drivers");
    expect(lastCall.items.map((i: { key: string }) => i.key)).not.toContain("vehicles");
  });

  it("usuario sin ningún permiso de catálogos NO ve el botón Catálogos", () => {
    renderRail("/dashboard", ["sales:read"]);
    expect(screen.queryByRole("button", { name: /Catálogos/ })).not.toBeInTheDocument();
  });

  it("usuario con SOLO vehicles:read igual ve el botón Catálogos (al menos un child visible)", () => {
    renderRail("/dashboard", ["vehicles:read"]);
    expect(screen.getByRole("button", { name: /Catálogos/ })).toBeInTheDocument();
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
