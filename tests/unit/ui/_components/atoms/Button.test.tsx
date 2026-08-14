import React from "react";
import { render, screen } from "@testing-library/react";
import { Button } from "../../../../../app/_components/atoms/Button/Button";

describe("Button", () => {
  it("renders primary variant", () => {
    const { container } = render(<Button>Guardar</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders with loading=true", () => {
    const { container } = render(<Button loading>Guardar</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders disabled", () => {
    const { container } = render(<Button disabled>Guardar</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  const VARIANTS = ["filled", "tonal", "outlined", "text", "destructive"] as const;
  const SIZES = ["sm", "md", "lg"] as const;

  it.each(VARIANTS)("renders variant=%s without crashing and stays a <button>", (variant) => {
    render(<Button variant={variant}>Acción</Button>);
    expect(screen.getByRole("button", { name: "Acción" })).toBeInTheDocument();
  });

  it.each(SIZES)("renders size=%s without crashing", (size) => {
    render(<Button size={size}>Acción</Button>);
    expect(screen.getByRole("button", { name: "Acción" })).toBeInTheDocument();
  });

  it("defaults to variant=filled and size=md", () => {
    render(<Button>Guardar</Button>);
    const button = screen.getByRole("button", { name: "Guardar" });
    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("text-label-lg");
  });

  it("loading disables the button and exposes aria-busy", () => {
    render(<Button loading>Guardar</Button>);
    const button = screen.getByRole("button", { name: /guardar/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("renders an icon when icon prop is provided", () => {
    const { container } = render(<Button icon="add">Agregar</Button>);
    expect(container.querySelector(".material-symbols-outlined")?.textContent).toBe("add");
  });

  it("does not render an icon while loading, even if icon is provided", () => {
    const { container } = render(
      <Button icon="add" loading>
        Agregar
      </Button>
    );
    expect(container.querySelector(".material-symbols-outlined")).toBeNull();
  });
});
