import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("../../../../../app/_hooks/useCurrentUser", () => ({ useCurrentUser: jest.fn() }));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

import { useCurrentUser } from "../../../../../app/_hooks/useCurrentUser";
import { CatalogsHubPage } from "../../../../../app/(private)/catalogs/_blocks/CatalogsHubPage";

describe("CatalogsHubPage", () => {
  it("renderiza las 7 tarjetas de catálogos incluyendo Productos y Tasas de Impuesto", () => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      can: jest.fn(() => true),
    });
    render(<CatalogsHubPage />);
    expect(screen.getByText("Formas de pago")).toBeInTheDocument();
    expect(screen.getByText("Folios")).toBeInTheDocument();
    expect(screen.getByText("Departamentos")).toBeInTheDocument();
    expect(screen.getByText("Sucursales")).toBeInTheDocument();
    expect(screen.getByText("Proveedores")).toBeInTheDocument();
    expect(screen.getByText("Productos")).toBeInTheDocument();
  });

  it("la tarjeta de Proveedores aparece como 'Sin acceso' cuando falta providers:read", () => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      can: jest.fn((p: string) => (p === "providers:read" ? false : true)),
    });
    render(<CatalogsHubPage />);
    expect(screen.getByText("Proveedores")).toBeInTheDocument();
    expect(screen.getAllByText("Sin acceso").length).toBeGreaterThanOrEqual(1);
  });

  it("tarjeta con permiso payment_methods:read=false muestra 'Sin acceso' en lugar de 'Abrir'", () => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      can: jest.fn((p: string) => p === "payment_methods:read" ? false : true),
    });
    render(<CatalogsHubPage />);
    expect(screen.getAllByText("Sin acceso").length).toBeGreaterThanOrEqual(1);
  });

  it("tarjeta con permiso payment_methods:read=true muestra link 'Abrir' con href correcto", () => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      can: jest.fn(() => true),
    });
    render(<CatalogsHubPage />);
    const links = screen.getAllByRole("link", { name: /Abrir/i });
    const paymentLink = links.find((l) => l.getAttribute("href") === "/catalogs/payment-methods");
    expect(paymentLink).toBeInTheDocument();
  });

  it("tarjeta con permiso 'loading' muestra link 'Abrir' (comportamiento optimista)", () => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      can: jest.fn(() => "loading" as const),
    });
    render(<CatalogsHubPage />);
    expect(screen.getAllByRole("link", { name: /Abrir/i }).length).toBe(7);
    expect(screen.queryByText("Sin acceso")).not.toBeInTheDocument();
  });

  it("todos los links apuntan a las rutas correctas cuando todos los permisos son true", () => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      can: jest.fn(() => true),
    });
    render(<CatalogsHubPage />);
    const links = screen.getAllByRole("link", { name: /Abrir/i });
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/catalogs/payment-methods");
    expect(hrefs).toContain("/catalogs/folios");
    expect(hrefs).toContain("/catalogs/departments");
    expect(hrefs).toContain("/catalogs/branches");
    expect(hrefs).toContain("/catalogs/providers");
    expect(hrefs).toContain("/catalogs/products");
  });

  it("tarjeta Productos muestra 'Sin acceso' cuando products:read es false", () => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      can: jest.fn((p: string) => (p === "products:read" ? false : true)),
    });
    render(<CatalogsHubPage />);
    expect(screen.getByText("Productos")).toBeInTheDocument();
    expect(screen.getAllByText("Sin acceso").length).toBeGreaterThanOrEqual(1);
  });
});
