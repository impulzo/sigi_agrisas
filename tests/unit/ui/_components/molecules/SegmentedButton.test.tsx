/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("../../../../../app/_components/atoms/Icon/Icon", () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`}>{name}</span>,
}));

import { SegmentedButton } from "../../../../../app/_components/molecules/SegmentedButton/SegmentedButton";

const options = [
  { value: "sale" as const, label: "Venta" },
  { value: "quote" as const, label: "Cotización" },
] as const;

describe("SegmentedButton", () => {
  it("renderiza todas las opciones", () => {
    render(<SegmentedButton value="sale" options={[...options]} onChange={jest.fn()} />);
    expect(screen.getByRole("tab", { name: "Venta" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Cotización" })).toBeInTheDocument();
  });

  it("ítem seleccionado tiene aria-selected=true", () => {
    render(<SegmentedButton value="sale" options={[...options]} onChange={jest.fn()} />);
    expect(screen.getByRole("tab", { name: "Venta" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Cotización" })).toHaveAttribute("aria-selected", "false");
  });

  it("click invoca onChange con el valor correcto", () => {
    const onChange = jest.fn();
    render(<SegmentedButton value="sale" options={[...options]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Cotización" }));
    expect(onChange).toHaveBeenCalledWith("quote");
  });

  it("click en ítem ya seleccionado también invoca onChange", () => {
    const onChange = jest.fn();
    render(<SegmentedButton value="sale" options={[...options]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Venta" }));
    expect(onChange).toHaveBeenCalledWith("sale");
  });

  it("disabled deshabilita todos los tabs", () => {
    render(<SegmentedButton value="sale" options={[...options]} onChange={jest.fn()} disabled />);
    expect(screen.getByRole("tab", { name: "Venta" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Cotización" })).toBeDisabled();
  });

  it("renderiza el aria-label del contenedor tablist", () => {
    render(
      <SegmentedButton
        value="sale"
        options={[...options]}
        onChange={jest.fn()}
        aria-label="Modo de operación"
      />,
    );
    expect(screen.getByRole("tablist", { name: "Modo de operación" })).toBeInTheDocument();
  });

  it("renderiza icono cuando la opción lo incluye", () => {
    const withIcon = [
      { value: "sale" as const, label: "Venta", icon: "point_of_sale" as const },
      { value: "quote" as const, label: "Cotización", icon: "request_quote" as const },
    ];
    render(<SegmentedButton value="sale" options={withIcon} onChange={jest.fn()} />);
    expect(screen.getByTestId("icon-point_of_sale")).toBeInTheDocument();
    expect(screen.getByTestId("icon-request_quote")).toBeInTheDocument();
  });
});
