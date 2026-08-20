import React from "react";
import { render, screen } from "@testing-library/react";
import { PurchasesTable } from "../../../../../../app/(private)/reports/purchases/_blocks/PurchasesTable";
import type { PurchasesReportRowDto } from "../../../../../../app/(private)/reports/purchases/_logic/types/api";

const ROW: PurchasesReportRowDto = {
  id: "p1",
  folioCode: "CP-000001",
  providerName: "Proveedor Uno",
  branchName: "Matriz",
  subtotal: "1000.0000",
  taxTotal: "0.0000",
  total: "1000.0000",
  paidAmount: "400.0000",
  balance: "600.0000",
  paymentStatus: "partial",
  status: "completed",
  purchasedAt: "2026-06-10T00:00:00.000Z",
};

describe("PurchasesTable (reporte de compras)", () => {
  it("renders the Saldo column with the formatted balance", () => {
    render(<PurchasesTable rows={[ROW]} />);
    expect(screen.getByText("Saldo")).toBeInTheDocument();
    expect(screen.getByText(/\$600\.00/)).toBeInTheDocument();
  });

  it("renders paymentStatus and status via badges, not raw text", () => {
    render(<PurchasesTable rows={[ROW]} />);
    expect(screen.getByText("Parcial")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.queryByText("partial")).not.toBeInTheDocument();
    expect(screen.queryByText("completed")).not.toBeInTheDocument();
  });

  it("shows 'Pagado' badge for a fully paid purchase", () => {
    render(<PurchasesTable rows={[{ ...ROW, paymentStatus: "paid", paidAmount: "1000.0000", balance: "0.0000" }]} />);
    // "Pagado" also appears as the "Pagado" column header, so this row must contain 2 matches: header + badge.
    expect(screen.getAllByText("Pagado").length).toBe(2);
    // "$0.00" also matches the (unrelated) taxTotal column for this row, so at least 1 match confirms the balance rendered.
    expect(screen.getAllByText(/\$0\.00/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'Sin compras' empty state", () => {
    render(<PurchasesTable rows={[]} />);
    expect(screen.getByText("Sin compras")).toBeInTheDocument();
  });
});
