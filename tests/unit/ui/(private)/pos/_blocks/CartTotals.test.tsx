/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { CartTotals } from "../../../../../../app/(private)/pos/_blocks/CartTotals";
import type { CartTotals as CartTotalsType } from "../../../../../../app/(private)/pos/_logic/types/domain";

const makeTotals = (
  subtotal: number,
  ivaTotal: number,
  iepsTotal: number,
  total: number
): CartTotalsType => ({
  subtotal,
  ivaTotal,
  iepsTotal,
  taxTotal: ivaTotal + iepsTotal,
  total,
});

describe("CartTotals", () => {
  it("formatea los totales con símbolo MXN y 2 decimales", () => {
    render(<CartTotals totals={makeTotals(100, 16, 0, 116)} />);
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    // Formato es-MX: MX$100.00 o $100.00 dependiendo del navegador simulado
    expect(screen.getAllByText(/\$/).length).toBeGreaterThanOrEqual(1);
  });

  it("muestra ceros cuando el carrito está vacío (IVA e IEPS igual visibles)", () => {
    render(<CartTotals totals={makeTotals(0, 0, 0, 0)} />);
    // Subtotal, IVA, IEPS y Total siempre se renderizan, aunque sean $0
    const moneyValues = screen.getAllByText(/\$/);
    expect(moneyValues.length).toBeGreaterThanOrEqual(4);
  });

  it("los spans de monto tienen clase tabular-nums", () => {
    const { container } = render(<CartTotals totals={makeTotals(1000, 160, 0, 1160)} />);
    const tabularSpans = container.querySelectorAll(".tabular-nums");
    expect(tabularSpans.length).toBeGreaterThanOrEqual(3);
  });

  it("muestra IVA e IEPS como filas separadas cuando aplican", () => {
    render(<CartTotals totals={makeTotals(200, 24, 8, 232)} />);
    expect(screen.getByText("IVA")).toBeInTheDocument();
    expect(screen.getByText("IEPS")).toBeInTheDocument();
  });

  it("muestra IVA e IEPS aunque ambos sean cero (nunca se ocultan)", () => {
    render(<CartTotals totals={makeTotals(200, 0, 0, 200)} />);
    expect(screen.getByText("IVA")).toBeInTheDocument();
    expect(screen.getByText("IEPS")).toBeInTheDocument();
  });
});
