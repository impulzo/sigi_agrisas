import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FoliosTable } from "../../../../../../app/(private)/catalogs/folios/_blocks/FoliosTable";
import type { Folio } from "../../../../../../app/(private)/catalogs/folios/_logic/types/domain";

const ACTIVE_ITEM: Folio = {
  id: "f1",
  code: "FACT_A",
  name: "Factura A",
  prefix: "FA",
  currentNumber: 100,
  isActive: true,
  createdAt: new Date("2026-05-01"),
  updatedAt: new Date("2026-05-01"),
};

const INACTIVE_ITEM: Folio = {
  id: "f2",
  code: "REM_B",
  name: "Remisión B",
  prefix: null,
  currentNumber: 0,
  isActive: false,
  createdAt: new Date("2026-05-01"),
  updatedAt: new Date("2026-05-01"),
};

describe("FoliosTable", () => {
  it("renderiza filas con los datos de los items", () => {
    render(
      <FoliosTable
        items={[ACTIVE_ITEM, INACTIVE_ITEM]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.getByText("FACT_A")).toBeInTheDocument();
    expect(screen.getByText("Factura A")).toBeInTheDocument();
    expect(screen.getByText("REM_B")).toBeInTheDocument();
    expect(screen.getByText("Remisión B")).toBeInTheDocument();
  });

  it("muestra prefix y currentNumber correctamente", () => {
    render(
      <FoliosTable
        items={[ACTIVE_ITEM]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.getByText("FA")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("columna Acciones NO se renderiza si canWrite=false", () => {
    render(
      <FoliosTable
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
      <FoliosTable
        items={[ACTIVE_ITEM]}
        canWrite={true}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.getByText("Acciones")).toBeInTheDocument();
  });

  it("muestra badge Activo para item activo", () => {
    render(
      <FoliosTable
        items={[ACTIVE_ITEM]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("muestra badge Inactivo para item inactivo", () => {
    render(
      <FoliosTable
        items={[INACTIVE_ITEM]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("botón Desactivar en item activo con canWrite llama onSoftDelete", async () => {
    const onSoftDelete = jest.fn();
    render(
      <FoliosTable
        items={[ACTIVE_ITEM]}
        canWrite={true}
        onEdit={jest.fn()}
        onSoftDelete={onSoftDelete}
        onReactivate={jest.fn()}
      />
    );
    await userEvent.setup().click(screen.getByTitle("Desactivar"));
    expect(onSoftDelete).toHaveBeenCalledWith("f1");
  });

  it("botón Reactivar en item inactivo con canWrite llama onReactivate", async () => {
    const onReactivate = jest.fn();
    render(
      <FoliosTable
        items={[INACTIVE_ITEM]}
        canWrite={true}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={onReactivate}
      />
    );
    await userEvent.setup().click(screen.getByTitle("Reactivar"));
    expect(onReactivate).toHaveBeenCalledWith("f2");
  });

  it("skeleton visible cuando isLoading=true", () => {
    const { container } = render(
      <FoliosTable
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
