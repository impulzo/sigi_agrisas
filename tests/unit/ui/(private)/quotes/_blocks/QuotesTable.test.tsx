/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
jest.mock("../../../../../../app/_components/atoms/Skeleton/Skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

import { QuotesTable } from "../../../../../../app/(private)/quotes/_blocks/QuotesTable";
import type { Quote } from "../../../../../../app/(private)/quotes/_logic/types/domain";

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: "q1",
    branchId: "b1",
    branchName: "Sucursal A",
    customerId: "c1",
    customerName: "Cliente Prueba",
    creatorId: "u1",
    creatorName: "Vendedor Uno",
    folioId: "f1",
    folioNumber: 1,
    folioPrefix: "COT",
    status: "draft",
    isExpired: false,
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    expiresAt: null,
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
    ...overrides,
  };
}

describe("QuotesTable", () => {
  it("renderiza la fila con el folio correcto", () => {
    render(<QuotesTable items={[makeQuote()]} isLoading={false} showBranch={false} />);
    expect(screen.getByText("COT-1")).toBeInTheDocument();
  });

  it("columna Sucursal NO se renderiza cuando showBranch=false", () => {
    render(<QuotesTable items={[makeQuote()]} isLoading={false} showBranch={false} />);
    expect(screen.queryByText("Sucursal")).not.toBeInTheDocument();
    expect(screen.queryByText("Sucursal A")).not.toBeInTheDocument();
  });

  it("columna Sucursal SÍ se renderiza cuando showBranch=true", () => {
    render(<QuotesTable items={[makeQuote()]} isLoading={false} showBranch={true} />);
    expect(screen.getByRole("columnheader", { name: /sucursal/i })).toBeInTheDocument();
    expect(screen.getByText("Sucursal A")).toBeInTheDocument();
  });

  it("fila con isExpired=true recibe clase de tinte de error", () => {
    const { container } = render(
      <QuotesTable items={[makeQuote({ isExpired: true, status: "authorized" })]} isLoading={false} showBranch={false} />,
    );
    const row = container.querySelector("tr.bg-error-container\\/10");
    expect(row).not.toBeNull();
  });

  it("fila con isExpired=false NO recibe clase de tinte de error", () => {
    const { container } = render(
      <QuotesTable items={[makeQuote({ isExpired: false })]} isLoading={false} showBranch={false} />,
    );
    const row = container.querySelector("tr.bg-error-container\\/10");
    expect(row).toBeNull();
  });

  it("fila con status=converted y convertedSaleId muestra link 'Ver venta'", () => {
    render(
      <QuotesTable
        items={[makeQuote({ status: "converted", convertedSaleId: "SALE-1" })]}
        isLoading={false}
        showBranch={false}
      />,
    );
    const link = screen.getByRole("link", { name: /ver venta/i });
    expect(link).toHaveAttribute("href", "/sales/SALE-1");
  });

  it("fila con status=converted sin convertedSaleId NO muestra link 'Ver venta'", () => {
    render(
      <QuotesTable
        items={[makeQuote({ status: "converted", convertedSaleId: null })]}
        isLoading={false}
        showBranch={false}
      />,
    );
    expect(screen.queryByRole("link", { name: /ver venta/i })).not.toBeInTheDocument();
  });

  it("muestra skeleton durante isLoading=true", () => {
    render(<QuotesTable items={[]} isLoading={true} showBranch={false} />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
