import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DepartmentsTable } from "../../../../../../app/(private)/catalogs/departments/_blocks/DepartmentsTable";
import type { Department } from "../../../../../../app/(private)/catalogs/departments/_logic/types/domain";

const ACTIVE_ITEM: Department = {
  id: "d1",
  code: "VENTAS",
  name: "Ventas",
  description: "Departamento de ventas",
  isActive: true,
  createdAt: new Date("2026-05-01"),
  updatedAt: new Date("2026-05-01"),
};

const INACTIVE_ITEM: Department = {
  id: "d2",
  code: "COMPRAS",
  name: "Compras",
  description: null,
  isActive: false,
  createdAt: new Date("2026-05-01"),
  updatedAt: new Date("2026-05-01"),
};

describe("DepartmentsTable", () => {
  it("renderiza filas con los datos de los items", () => {
    render(
      <DepartmentsTable
        items={[ACTIVE_ITEM, INACTIVE_ITEM]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.getByText("VENTAS")).toBeInTheDocument();
    expect(screen.getByText("Ventas")).toBeInTheDocument();
    expect(screen.getByText("COMPRAS")).toBeInTheDocument();
    expect(screen.getByText("Compras")).toBeInTheDocument();
  });

  it("columna Acciones NO se renderiza si canWrite=false", () => {
    render(
      <DepartmentsTable
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
      <DepartmentsTable
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
      <DepartmentsTable
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
      <DepartmentsTable
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
      <DepartmentsTable
        items={[ACTIVE_ITEM]}
        canWrite={true}
        onEdit={jest.fn()}
        onSoftDelete={onSoftDelete}
        onReactivate={jest.fn()}
      />
    );
    await userEvent.setup().click(screen.getByTitle("Desactivar"));
    expect(onSoftDelete).toHaveBeenCalledWith("d1");
  });

  it("botón Reactivar en item inactivo con canWrite llama onReactivate", async () => {
    const onReactivate = jest.fn();
    render(
      <DepartmentsTable
        items={[INACTIVE_ITEM]}
        canWrite={true}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={onReactivate}
      />
    );
    await userEvent.setup().click(screen.getByTitle("Reactivar"));
    expect(onReactivate).toHaveBeenCalledWith("d2");
  });

  it("skeleton visible cuando isLoading=true", () => {
    const { container } = render(
      <DepartmentsTable
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
