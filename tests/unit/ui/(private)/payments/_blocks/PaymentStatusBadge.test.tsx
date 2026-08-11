/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { PaymentStatusBadge } from "../../../../../../app/(private)/payments/_blocks/PaymentStatusBadge";

describe("PaymentStatusBadge", () => {
  it("muestra 'Activo' cuando el abono está activo y la venta sigue parcial", () => {
    render(<PaymentStatusBadge status="completed" salePaymentStatus="partial" />);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("muestra 'Activo' cuando el abono está activo y la venta está pendiente", () => {
    render(<PaymentStatusBadge status="completed" salePaymentStatus="pending" />);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("muestra 'Completado' solo cuando la venta llega al 100%", () => {
    render(<PaymentStatusBadge status="completed" salePaymentStatus="paid" />);
    expect(screen.getByText("Completado")).toBeInTheDocument();
  });

  it("muestra 'Cancelado' sin importar el estado de pago de la venta", () => {
    render(<PaymentStatusBadge status="cancelled" salePaymentStatus="paid" />);
    expect(screen.getByText("Cancelado")).toBeInTheDocument();
  });

  it("muestra 'Cancelado' incluso si la venta sigue pendiente", () => {
    render(<PaymentStatusBadge status="cancelled" salePaymentStatus="pending" />);
    expect(screen.getByText("Cancelado")).toBeInTheDocument();
  });
});
