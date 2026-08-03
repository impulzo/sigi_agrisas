/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { PurchaseStatusBadge } from "../../../../../../app/(private)/purchases/_blocks/PurchaseStatusBadge";

describe("PurchaseStatusBadge", () => {
  it("renderiza 'Activa' con bg-primary-container para completed", () => {
    const { container } = render(<PurchaseStatusBadge status="completed" />);
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(container.querySelector("span")).toHaveClass("bg-primary-container");
  });

  it("renderiza 'Cancelada' con bg-surface-container-highest para cancelled", () => {
    const { container } = render(<PurchaseStatusBadge status="cancelled" />);
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
    expect(container.querySelector("span")).toHaveClass("bg-surface-container-highest");
  });
});
