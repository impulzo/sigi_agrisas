/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { WaybillTypeToggle } from "../../../../../app/(private)/waybills/_blocks/WaybillTypeToggle";

describe("WaybillTypeToggle — gating por waybills:stamp", () => {
  it("canStamp=true → muestra ambas opciones", () => {
    render(<WaybillTypeToggle value="simple" onChange={jest.fn()} canStamp />);

    expect(screen.getByRole("tab", { name: "Traspaso simple" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Con Carta Porte" })).toBeInTheDocument();
  });

  it("canStamp=false → la opción 'Con Carta Porte' no se renderiza (omitida, no deshabilitada)", () => {
    render(<WaybillTypeToggle value="simple" onChange={jest.fn()} canStamp={false} />);

    expect(screen.getByRole("tab", { name: "Traspaso simple" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Con Carta Porte" })).not.toBeInTheDocument();
    expect(screen.queryByText("Con Carta Porte")).not.toBeInTheDocument();
  });

  it("canStamp=false → muestra mensaje explicando la falta de permiso", () => {
    render(<WaybillTypeToggle value="simple" onChange={jest.fn()} canStamp={false} />);

    expect(
      screen.getByText(/No tienes permiso para timbrar Carta Porte/i)
    ).toBeInTheDocument();
  });

  it("canStamp=true → no muestra el mensaje de permiso faltante", () => {
    render(<WaybillTypeToggle value="simple" onChange={jest.fn()} canStamp />);

    expect(
      screen.queryByText(/No tienes permiso para timbrar Carta Porte/i)
    ).not.toBeInTheDocument();
  });

  it("value='carta_porte' marca esa pestaña como seleccionada", () => {
    render(<WaybillTypeToggle value="carta_porte" onChange={jest.fn()} canStamp />);

    expect(screen.getByRole("tab", { name: "Con Carta Porte" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: "Traspaso simple" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("click en 'Con Carta Porte' invoca onChange con 'carta_porte'", async () => {
    const onChange = jest.fn();
    render(<WaybillTypeToggle value="simple" onChange={onChange} canStamp />);

    screen.getByRole("tab", { name: "Con Carta Porte" }).click();
    expect(onChange).toHaveBeenCalledWith("carta_porte");
  });
});
