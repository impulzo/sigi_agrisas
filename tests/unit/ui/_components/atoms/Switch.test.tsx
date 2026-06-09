import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "../../../../../app/_components/atoms/Switch/Switch";

describe("Switch", () => {
  it("renders with aria-checked=false when checked=false", () => {
    render(<Switch checked={false} onChange={jest.fn()} aria-label="Toggle" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("renders with aria-checked=true when checked=true", () => {
    render(<Switch checked={true} onChange={jest.fn()} aria-label="Toggle" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("calls onChange(true) when clicked and was false", () => {
    const onChange = jest.fn();
    render(<Switch checked={false} onChange={onChange} aria-label="Toggle" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not call onChange when disabled", () => {
    const onChange = jest.fn();
    render(<Switch checked={false} onChange={onChange} disabled aria-label="Toggle" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("calls onChange with negation when Space key is pressed", async () => {
    const onChange = jest.fn();
    render(<Switch checked={false} onChange={onChange} aria-label="Toggle" />);
    await userEvent.setup().type(screen.getByRole("switch"), " ");
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("applies the aria-label correctly", () => {
    render(<Switch checked={false} onChange={jest.fn()} aria-label="Activar notificaciones" />);
    expect(screen.getByRole("switch", { name: "Activar notificaciones" })).toBeInTheDocument();
  });

  it("has role switch", () => {
    render(<Switch checked={false} onChange={jest.fn()} aria-label="Toggle" />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });
});
