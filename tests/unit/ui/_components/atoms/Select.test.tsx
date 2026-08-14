import React from "react";
import { render, screen } from "@testing-library/react";
import { Select } from "../../../../../app/_components/atoms/Select/Select";

describe("Select", () => {
  it("renders a native select with its options", () => {
    render(
      <Select aria-label="Sucursal" value="b1" onChange={() => {}}>
        <option value="">— Selecciona —</option>
        <option value="b1">Sucursal 1</option>
      </Select>
    );
    const select = screen.getByRole("combobox", { name: "Sucursal" });
    expect(select).toHaveValue("b1");
    expect(screen.getByText("Sucursal 1")).toBeInTheDocument();
  });

  it("shares the base contract of tokens with Input (border-outline, rounded)", () => {
    render(
      <Select aria-label="Sucursal">
        <option value="">—</option>
      </Select>
    );
    const select = screen.getByRole("combobox", { name: "Sucursal" });
    expect(select.className).toContain("border-outline");
    expect(select.className).toContain("bg-surface-container-lowest");
  });

  it("applies error styling and aria-invalid when error is set", () => {
    render(
      <Select aria-label="Sucursal" error="Requerido">
        <option value="">—</option>
      </Select>
    );
    const select = screen.getByRole("combobox", { name: "Sucursal" });
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select.className).toContain("border-error");
  });

  it("disabled prevents interaction", () => {
    render(
      <Select aria-label="Sucursal" disabled>
        <option value="">—</option>
      </Select>
    );
    expect(screen.getByRole("combobox", { name: "Sucursal" })).toBeDisabled();
  });
});
