/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { ReturnStatusBadge } from "../../../../../../app/(private)/returns/_blocks/ReturnStatusBadge";

describe("ReturnStatusBadge", () => {
  it("renderiza 'Activa' con bg-primary-container para completed", () => {
    const { container } = render(<ReturnStatusBadge status="completed" />);
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(container.querySelector("span")).toHaveClass("bg-primary-container");
  });

  it("renderiza 'Cancelada' con bg-surface-container-highest para cancelled", () => {
    const { container } = render(<ReturnStatusBadge status="cancelled" />);
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
    expect(container.querySelector("span")).toHaveClass("bg-surface-container-highest");
  });
});
