import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BranchesTable } from "../../../../../../app/(private)/catalogs/branches/_blocks/BranchesTable";
import type { Branch } from "../../../../../../app/(private)/catalogs/branches/_logic/types/domain";

const ACTIVE_ITEM: Branch = {
  id: "b1",
  code: "CDMX_01",
  name: "Ciudad de México",
  address: "Av. Insurgentes 1234",
  phone: "5512345678",
  email: "cdmx@empresa.com",
  isActive: true,
  createdAt: new Date("2026-05-01"),
  updatedAt: new Date("2026-05-01"),
};

const INACTIVE_ITEM: Branch = {
  id: "b2",
  code: "MTY_01",
  name: "Monterrey",
  address: null,
  phone: null,
  email: null,
  isActive: false,
  createdAt: new Date("2026-05-01"),
  updatedAt: new Date("2026-05-01"),
};

describe("BranchesTable", () => {
  it("renderiza filas con los datos de los items", () => {
    render(
      <BranchesTable
        items={[ACTIVE_ITEM, INACTIVE_ITEM]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.getByText("CDMX_01")).toBeInTheDocument();
    expect(screen.getByText("Ciudad de México")).toBeInTheDocument();
    expect(screen.getByText("MTY_01")).toBeInTheDocument();
    expect(screen.getByText("Monterrey")).toBeInTheDocument();
  });

  it("muestra phone y email del item", () => {
    render(
      <BranchesTable
        items={[ACTIVE_ITEM]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.getByText("5512345678")).toBeInTheDocument();
    expect(screen.getByText("cdmx@empresa.com")).toBeInTheDocument();
  });

  it("columna Acciones NO se renderiza si canWrite=false", () => {
    render(
      <BranchesTable
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
      <BranchesTable
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
      <BranchesTable
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
      <BranchesTable
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
      <BranchesTable
        items={[ACTIVE_ITEM]}
        canWrite={true}
        onEdit={jest.fn()}
        onSoftDelete={onSoftDelete}
        onReactivate={jest.fn()}
      />
    );
    await userEvent.setup().click(screen.getByTitle("Desactivar"));
    expect(onSoftDelete).toHaveBeenCalledWith("b1");
  });

  it("botón Reactivar en item inactivo con canWrite llama onReactivate", async () => {
    const onReactivate = jest.fn();
    render(
      <BranchesTable
        items={[INACTIVE_ITEM]}
        canWrite={true}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={onReactivate}
      />
    );
    await userEvent.setup().click(screen.getByTitle("Reactivar"));
    expect(onReactivate).toHaveBeenCalledWith("b2");
  });

  it("skeleton visible cuando isLoading=true", () => {
    const { container } = render(
      <BranchesTable
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
