/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { BreakdownTable } from "../../../../../../app/(private)/reports/sales-cut/_blocks/BreakdownTable";

const rows = [
  { key: "p1", label: "Fertilizante (F1)", ticketCount: 2, subtotal: "100.0000", taxTotal: "16.0000", total: "116.0000", quantitySold: "4.0000" },
];

describe("BreakdownTable", () => {
  it("no muestra columna de piezas sin quantityHeader (tablas existentes no cambian)", () => {
    render(<BreakdownTable title="Por método de pago" conceptHeader="Método" rows={rows} />);
    expect(screen.queryByText("Piezas")).not.toBeInTheDocument();
    expect(screen.getByText("Fertilizante (F1)")).toBeInTheDocument();
  });

  it("muestra columna de piezas cuando se pasa quantityHeader", () => {
    render(<BreakdownTable title="Por producto" conceptHeader="Producto" rows={rows} quantityHeader="Piezas" />);
    expect(screen.getByText("Piezas")).toBeInTheDocument();
    expect(screen.getByText("4.0000")).toBeInTheDocument();
  });

  it("estado vacío respeta el colSpan según haya o no columna de piezas", () => {
    const { container } = render(
      <BreakdownTable title="Por producto" conceptHeader="Producto" rows={[]} quantityHeader="Piezas" />
    );
    const cell = container.querySelector("td[colspan]");
    expect(cell?.getAttribute("colspan")).toBe("6");
  });
});
