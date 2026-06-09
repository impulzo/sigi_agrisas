/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("next/link", () => {
  const Link = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: mockPush })),
}));

import { ReturnsTable } from "../../../../../../app/(private)/returns/_blocks/ReturnsTable";
import type { Return } from "../../../../../../app/(private)/returns/_logic/types/domain";

const NOW = new Date("2026-06-01T10:00:00Z");

function makeReturn(overrides: Partial<Return> = {}): Return {
  return {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    saleId: "s1",
    branchId: "b1",
    branchName: "Sucursal Norte",
    creatorId: "u1",
    creatorName: "Juan Pérez",
    customerName: "Cliente Test",
    customerRfc: "RFC123",
    status: "completed",
    reason: "Producto en mal estado",
    refundTotal: 150,
    returnedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    salefolioCode: "A",
    salefolioNumber: 42,
    ...overrides,
  };
}

describe("ReturnsTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renderiza todas las columnas principales", () => {
    render(<ReturnsTable items={[makeReturn()]} isLoading={false} showBranch={true} />);
    expect(screen.getByText("Folio venta")).toBeInTheDocument();
    expect(screen.getByText("Cliente")).toBeInTheDocument();
    expect(screen.getByText("Sucursal")).toBeInTheDocument();
    expect(screen.getByText("Devuelto por")).toBeInTheDocument();
    expect(screen.getByText("Reembolso")).toBeInTheDocument();
    expect(screen.getByText("Fecha")).toBeInTheDocument();
    expect(screen.getByText("Estado")).toBeInTheDocument();
    expect(screen.getByText("Acción")).toBeInTheDocument();
  });

  it("showBranch=false oculta la columna Sucursal", () => {
    render(<ReturnsTable items={[makeReturn()]} isLoading={false} showBranch={false} />);
    expect(screen.queryByText("Sucursal")).not.toBeInTheDocument();
    expect(screen.queryByText("Sucursal Norte")).not.toBeInTheDocument();
  });

  it("showBranch=true muestra la columna y el nombre de sucursal", () => {
    render(<ReturnsTable items={[makeReturn()]} isLoading={false} showBranch={true} />);
    expect(screen.getByText("Sucursal Norte")).toBeInTheDocument();
  });

  it("link en folio navega a /sales/[saleId]", () => {
    render(<ReturnsTable items={[makeReturn()]} isLoading={false} showBranch={false} />);
    const folioLink = screen.getByRole("link", { name: /A-42/i });
    expect(folioLink).toHaveAttribute("href", "/sales/s1");
  });

  it("botón Ver navega a /returns/[id]", async () => {
    const user = userEvent.setup();
    render(<ReturnsTable items={[makeReturn()]} isLoading={false} showBranch={false} />);
    const verBtn = screen.getByRole("button", { name: "Ver" });
    await user.click(verBtn);
    expect(mockPush).toHaveBeenCalledWith("/returns/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
  });

  it("muestra el nombre del cliente", () => {
    render(<ReturnsTable items={[makeReturn()]} isLoading={false} showBranch={false} />);
    expect(screen.getByText("Cliente Test")).toBeInTheDocument();
  });

  it("isLoading=true renderiza skeletons en vez de filas", () => {
    const { container } = render(<ReturnsTable items={[]} isLoading={true} showBranch={false} />);
    expect(container.querySelector("table")).not.toBeInTheDocument();
  });

  it("lista vacía y no loading muestra mensaje vacío", () => {
    render(<ReturnsTable items={[]} isLoading={false} showBranch={false} />);
    expect(screen.getByText(/Sin devoluciones registradas/i)).toBeInTheDocument();
  });
});
