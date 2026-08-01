/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { BranchPairSelector } from "../../../../../app/(private)/waybills/_blocks/BranchPairSelector";

const BRANCHES = [
  { id: "b1", name: "Sucursal A" },
  { id: "b2", name: "Sucursal B" },
  { id: "b3", name: "Sucursal C" },
];

describe("BranchPairSelector — exclusión mutua", () => {
  it("origen seleccionado se excluye de las opciones de destino", () => {
    render(
      <BranchPairSelector
        originBranchId="b1"
        onOriginChange={jest.fn()}
        destinationBranchId=""
        onDestinationChange={jest.fn()}
        branches={BRANCHES}
      />
    );

    const destinationSelect = screen.getByLabelText(/Sucursal de destino/i) as HTMLSelectElement;
    const options = Array.from(destinationSelect.options).map((o) => o.value);
    expect(options).not.toContain("b1");
    expect(options).toContain("b2");
    expect(options).toContain("b3");
  });

  it("destino seleccionado se excluye de las opciones de origen", () => {
    render(
      <BranchPairSelector
        originBranchId=""
        onOriginChange={jest.fn()}
        destinationBranchId="b2"
        onDestinationChange={jest.fn()}
        branches={BRANCHES}
      />
    );

    const originSelect = screen.getByLabelText(/Sucursal de origen/i) as HTMLSelectElement;
    const options = Array.from(originSelect.options).map((o) => o.value);
    expect(options).not.toContain("b2");
    expect(options).toContain("b1");
    expect(options).toContain("b3");
  });

  it("sin selección, ambos combos muestran todas las sucursales", () => {
    render(
      <BranchPairSelector
        originBranchId=""
        onOriginChange={jest.fn()}
        destinationBranchId=""
        onDestinationChange={jest.fn()}
        branches={BRANCHES}
      />
    );

    const originSelect = screen.getByLabelText(/Sucursal de origen/i) as HTMLSelectElement;
    const destinationSelect = screen.getByLabelText(/Sucursal de destino/i) as HTMLSelectElement;
    expect(originSelect.options.length).toBe(BRANCHES.length + 1); // + placeholder
    expect(destinationSelect.options.length).toBe(BRANCHES.length + 1);
  });
});
