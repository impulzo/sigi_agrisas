/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { SaleStatusBadge } from "../../../../../../app/(private)/sales/_blocks/SaleStatusBadge";

describe("SaleStatusBadge", () => {
  it("muestra 'Completada' con clases verdes para completed", () => {
    const { container } = render(<SaleStatusBadge status="completed" />);
    expect(screen.getByText("Completada")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("bg-green-100", "text-green-800");
  });

  it("muestra 'Cancelada' con clases rojas para cancelled", () => {
    const { container } = render(<SaleStatusBadge status="cancelled" />);
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("bg-red-100", "text-red-800");
  });

  it("muestra 'Editada' con clases ámbar para edited", () => {
    const { container } = render(<SaleStatusBadge status="edited" />);
    expect(screen.getByText("Editada")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("bg-amber-100", "text-amber-800");
  });
});
