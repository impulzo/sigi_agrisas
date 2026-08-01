import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaxRatesTable } from "../../../../../../app/(private)/catalogs/tax-rates/_blocks/TaxRatesTable";
import type { TaxRate } from "../../../../../../app/(private)/catalogs/tax-rates/_logic/types/domain";

const ACTIVE_ITEM: TaxRate = {
  id: "tr1",
  code: "IVA_16",
  name: "IVA 16%",
  description: "Impuesto al Valor Agregado tasa general 16%",
  satTaxCode: "002",
  factorType: "Tasa",
  displayValue: 16,
  rate: 0.16,
  transferredAccount: null,
  pendingTransferredAccount: null,
  creditedAccount: null,
  pendingCreditedAccount: null,
  isActive: true,
  createdAt: new Date("2026-05-01"),
  updatedAt: new Date("2026-05-01"),
};

const INACTIVE_ITEM: TaxRate = {
  ...ACTIVE_ITEM,
  id: "tr2",
  code: "IVA_0",
  name: "IVA 0%",
  rate: 0,
  displayValue: 0,
  isActive: false,
};

describe("TaxRatesTable", () => {
  it("renderiza filas con los datos de los items", () => {
    render(
      <TaxRatesTable
        items={[ACTIVE_ITEM, INACTIVE_ITEM]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.getByText("IVA_16")).toBeInTheDocument();
    expect(screen.getByText("IVA 16%")).toBeInTheDocument();
    expect(screen.getByText("IVA_0")).toBeInTheDocument();
  });

  it("columna Tasa muestra el porcentaje formateado", () => {
    render(
      <TaxRatesTable
        items={[ACTIVE_ITEM]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.getByText("16.0000%")).toBeInTheDocument();
  });

  it("columna Acciones NO se renderiza si canWrite=false", () => {
    render(
      <TaxRatesTable
        items={[ACTIVE_ITEM]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.queryByText("Acciones")).not.toBeInTheDocument();
  });

  it("columna Acciones se renderiza si canWrite=true", () => {
    render(
      <TaxRatesTable
        items={[ACTIVE_ITEM]}
        canWrite={true}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.getByText("Acciones")).toBeInTheDocument();
  });

  it("muestra badge Activo/Inactivo según el item", () => {
    render(
      <TaxRatesTable
        items={[ACTIVE_ITEM, INACTIVE_ITEM]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("botón Desactivar en item activo con canWrite llama onSoftDelete", async () => {
    const onSoftDelete = jest.fn();
    render(
      <TaxRatesTable
        items={[ACTIVE_ITEM]}
        canWrite={true}
        onEdit={jest.fn()}
        onSoftDelete={onSoftDelete}
        onReactivate={jest.fn()}
      />
    );
    await userEvent.setup().click(screen.getByTitle("Desactivar"));
    expect(onSoftDelete).toHaveBeenCalledWith("tr1");
  });

  it("botón Reactivar en item inactivo con canWrite llama onReactivate", async () => {
    const onReactivate = jest.fn();
    render(
      <TaxRatesTable
        items={[INACTIVE_ITEM]}
        canWrite={true}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={onReactivate}
      />
    );
    await userEvent.setup().click(screen.getByTitle("Reactivar"));
    expect(onReactivate).toHaveBeenCalledWith("tr2");
  });

  it("skeleton visible cuando isLoading=true", () => {
    const { container } = render(
      <TaxRatesTable
        items={[]}
        canWrite={true}
        isLoading={true}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });
});
