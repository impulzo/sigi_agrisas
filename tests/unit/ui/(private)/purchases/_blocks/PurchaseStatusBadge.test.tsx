/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { PurchaseStatusBadge, PurchasePaymentStatusBadge } from "../../../../../../app/(private)/purchases/_blocks/PurchaseStatusBadge";

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

describe("PurchasePaymentStatusBadge", () => {
  it("renderiza 'Pendiente' para pending", () => {
    render(<PurchasePaymentStatusBadge paymentStatus="pending" />);
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("renderiza 'Parcial' para partial", () => {
    render(<PurchasePaymentStatusBadge paymentStatus="partial" />);
    expect(screen.getByText("Parcial")).toBeInTheDocument();
  });

  it("renderiza 'Pagado' para paid", () => {
    render(<PurchasePaymentStatusBadge paymentStatus="paid" />);
    expect(screen.getByText("Pagado")).toBeInTheDocument();
  });
});
