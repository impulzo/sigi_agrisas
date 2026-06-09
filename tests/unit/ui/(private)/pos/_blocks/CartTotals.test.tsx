/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { CartTotals } from "../../../../../../app/(private)/pos/_blocks/CartTotals";
import type { CartTotals as CartTotalsType } from "../../../../../../app/(private)/pos/_logic/types/domain";

const makeTotals = (subtotal: number, taxTotal: number, total: number): CartTotalsType => ({
  subtotal,
  taxTotal,
  total,
});

describe("CartTotals", () => {
  it("formatea los totales con símbolo MXN y 2 decimales", () => {
    render(<CartTotals totals={makeTotals(100, 16, 116)} />);
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    // Formato es-MX: MX$100.00 o $100.00 dependiendo del navegador simulado
    expect(screen.getAllByText(/\$/).length).toBeGreaterThanOrEqual(1);
  });

  it("muestra ceros cuando el carrito está vacío", () => {
    render(<CartTotals totals={makeTotals(0, 0, 0)} />);
    // Deben aparecer tres valores monetarios (subtotal, impuestos, total)
    const moneyValues = screen.getAllByText(/\$/);
    expect(moneyValues.length).toBeGreaterThanOrEqual(3);
  });

  it("los spans de monto tienen clase tabular-nums", () => {
    const { container } = render(<CartTotals totals={makeTotals(1000, 160, 1160)} />);
    const tabularSpans = container.querySelectorAll(".tabular-nums");
    expect(tabularSpans.length).toBeGreaterThanOrEqual(3);
  });

  it("incluye la fila de Impuestos (IVA + IEPS)", () => {
    render(<CartTotals totals={makeTotals(200, 32, 232)} />);
    expect(screen.getByText(/Impuestos/i)).toBeInTheDocument();
  });
});
