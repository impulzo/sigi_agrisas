/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { KardexTable } from "../../../../../../../app/(private)/inventory/kardex/_blocks/KardexTable";
import type { KardexMovementDto } from "../../../../../../../app/(private)/inventory/kardex/_logic/types/api";

function makeMovement(overrides: Partial<KardexMovementDto> = {}): KardexMovementDto {
  return {
    movementAt: "2026-08-01T10:00:00.000Z",
    branchId: "b1",
    movementType: "adjustment_in",
    entrada: 5,
    salida: 0,
    saldo: 55,
    unit: "PZA",
    factor: 1,
    serie: null,
    unitCost: null,
    unitPrice: null,
    folioCode: "TS",
    folioNumber: 1,
    originFolioCode: null,
    originFolioNumber: null,
    customerId: null,
    providerId: null,
    status: "completed",
    notes: null,
    ...overrides,
  };
}

describe("KardexTable", () => {
  it("renders a 'Concepto' column header", () => {
    render(<KardexTable movements={[]} />);
    expect(screen.getByText("Concepto")).toBeInTheDocument();
  });

  it("shows the movement's notes in the Concepto column", () => {
    render(<KardexTable movements={[makeMovement({ notes: "Recepción factura 123" })]} />);
    expect(screen.getByText("Recepción factura 123")).toBeInTheDocument();
  });

  it("shows a dash when notes is null", () => {
    render(<KardexTable movements={[makeMovement({ notes: null })]} />);
    const cells = screen.getAllByText("—");
    expect(cells.length).toBeGreaterThan(0);
  });
});
