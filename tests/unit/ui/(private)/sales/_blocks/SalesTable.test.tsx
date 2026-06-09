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

import { SalesTable } from "../../../../../../app/(private)/sales/_blocks/SalesTable";
import type { SaleSummary } from "../../../../../../app/(private)/sales/_logic/types/domain";

function makeSale(id: string, status: "completed" | "cancelled" | "edited"): SaleSummary {
  return {
    id,
    branchId: "b1",
    cashierId: "user-1",
    cashierName: "Operador Test",
    folioId: "folio-1",
    folioNumber: 42,
    folioPrefix: "A",
    paymentMethodId: "pm-1",
    status,
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    paidAmount: 116,
    paymentStatus: "paid",
    isCredit: false,
    customerName: "Cliente Ejemplo",
    branchName: "Sucursal Central",
    createdAt: new Date("2026-05-30T10:00:00"),
    updatedAt: new Date("2026-05-30T10:00:00"),
  };
}

describe("SalesTable", () => {
  it("muestra esqueletos cuando isLoading=true", () => {
    const { container } = render(<SalesTable items={[]} isLoading={true} />);
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  it("muestra 'Sin ventas registradas' cuando no hay items", () => {
    render(<SalesTable items={[]} isLoading={false} />);
    expect(screen.getByText("Sin ventas registradas")).toBeInTheDocument();
  });

  it("renderiza fila con folio y nombre del cliente", () => {
    render(<SalesTable items={[makeSale("s1", "completed")]} isLoading={false} />);
    expect(screen.getByText("A-42")).toBeInTheDocument();
    expect(screen.getByText("Cliente Ejemplo")).toBeInTheDocument();
  });

  it("muestra badge Completada para status completed", () => {
    render(<SalesTable items={[makeSale("s1", "completed")]} isLoading={false} />);
    expect(screen.getByText("Completada")).toBeInTheDocument();
  });

  it("muestra badge Cancelada para status cancelled", () => {
    render(<SalesTable items={[makeSale("s1", "cancelled")]} isLoading={false} />);
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
  });

  it("muestra badge Editada para status edited", () => {
    render(<SalesTable items={[makeSale("s1", "edited")]} isLoading={false} />);
    expect(screen.getByText("Editada")).toBeInTheDocument();
  });

  it("el folio es un link a /sales/:id", () => {
    render(<SalesTable items={[makeSale("s1", "completed")]} isLoading={false} />);
    const link = screen.getByRole("link", { name: /A-42/ });
    expect(link).toHaveAttribute("href", "/sales/s1");
  });
});
