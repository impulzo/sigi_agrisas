import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReturnLineRow } from "../../../../app/(private)/sales/[id]/returns/new/_blocks/ReturnLineRow";

describe("ReturnLineRow", () => {
  it("muestra 'Disponible: N' cuando maxQuantity > 0", () => {
    render(
      <ReturnLineRow
        productName="Producto Test"
        maxQuantity={7}
        value={0}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByText("Disponible: 7")).toBeInTheDocument();
  });

  it("input tiene max={maxQuantity}", () => {
    render(
      <ReturnLineRow
        productName="Producto Test"
        maxQuantity={5}
        value={0}
        onChange={jest.fn()}
      />
    );
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("max", "5");
  });

  it("renderiza badge 'Devuelto' y no input cuando maxQuantity === 0", () => {
    render(
      <ReturnLineRow
        productName="Producto Devuelto"
        maxQuantity={0}
        value={0}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByText("Devuelto")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  it("llama onChange al cambiar el input", () => {
    const onChange = jest.fn();
    render(
      <ReturnLineRow
        productName="Producto Test"
        maxQuantity={10}
        value={0}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "3" } });
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
