/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { SalePaymentStatusBadge } from "../../../../../../app/(private)/sales/_blocks/SalePaymentStatusBadge";

describe("SalePaymentStatusBadge", () => {
  it("renders 'Pagado' for paid status when isCredit=true", () => {
    render(<SalePaymentStatusBadge status="paid" isCredit={true} />);
    expect(screen.getByText("Pagado")).toBeInTheDocument();
  });

  it("renders 'Parcial' for partial status when isCredit=true", () => {
    render(<SalePaymentStatusBadge status="partial" isCredit={true} />);
    expect(screen.getByText("Parcial")).toBeInTheDocument();
  });

  it("renders 'Pendiente' for pending status when isCredit=true", () => {
    render(<SalePaymentStatusBadge status="pending" isCredit={true} />);
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("renders nothing when isCredit=false", () => {
    const { container } = render(<SalePaymentStatusBadge status="paid" isCredit={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("applies green class for paid", () => {
    render(<SalePaymentStatusBadge status="paid" isCredit={true} />);
    const badge = screen.getByText("Pagado").closest("span");
    expect(badge?.className).toContain("green");
  });

  it("applies yellow class for partial", () => {
    render(<SalePaymentStatusBadge status="partial" isCredit={true} />);
    const badge = screen.getByText("Parcial").closest("span");
    expect(badge?.className).toContain("yellow");
  });

  it("applies red class for pending", () => {
    render(<SalePaymentStatusBadge status="pending" isCredit={true} />);
    const badge = screen.getByText("Pendiente").closest("span");
    expect(badge?.className).toContain("red");
  });
});
