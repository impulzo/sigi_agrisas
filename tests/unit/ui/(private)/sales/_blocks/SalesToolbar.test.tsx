/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SalesToolbar } from "../../../../../../app/(private)/sales/_blocks/SalesToolbar";

const branches = [
  { id: "b1", name: "Sucursal Norte" },
  { id: "b2", name: "Sucursal Sur" },
];

const baseProps = {
  search: "",
  onSearchChange: jest.fn(),
  branchId: "",
  onBranchChange: jest.fn(),
  branches,
  showBranchFilter: false,
  statusFilter: [],
  onStatusChange: jest.fn(),
  from: "",
  to: "",
  onFromChange: jest.fn(),
  onToChange: jest.fn(),
  onReset: jest.fn(),
};

describe("SalesToolbar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("NO muestra el filtro de sucursal cuando showBranchFilter=false", () => {
    render(<SalesToolbar {...baseProps} showBranchFilter={false} />);
    expect(screen.queryByRole("combobox", { name: /Filtrar por sucursal/i })).not.toBeInTheDocument();
  });

  it("SÍ muestra el filtro de sucursal cuando showBranchFilter=true (bypass)", () => {
    render(<SalesToolbar {...baseProps} showBranchFilter={true} />);
    expect(screen.getByRole("combobox", { name: /Filtrar por sucursal/i })).toBeInTheDocument();
  });

  it("muestra todas las sucursales en el select cuando showBranchFilter=true", () => {
    render(<SalesToolbar {...baseProps} showBranchFilter={true} />);
    expect(screen.getByRole("option", { name: "Sucursal Norte" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sucursal Sur" })).toBeInTheDocument();
  });

  it("los chips de estado renderizan Completada, Cancelada y Editada", () => {
    render(<SalesToolbar {...baseProps} />);
    expect(screen.getByRole("button", { name: "Completada" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelada" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editada" })).toBeInTheDocument();
  });

  it("llama onStatusChange con el valor al hacer click en un chip", async () => {
    const onStatusChange = jest.fn();
    render(<SalesToolbar {...baseProps} onStatusChange={onStatusChange} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Completada" }));
    expect(onStatusChange).toHaveBeenCalledWith(["completed"]);
  });

  it("deselecciona un chip si ya estaba seleccionado", async () => {
    const onStatusChange = jest.fn();
    render(<SalesToolbar {...baseProps} statusFilter={["completed"]} onStatusChange={onStatusChange} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Completada" }));
    expect(onStatusChange).toHaveBeenCalledWith([]);
  });

  it("NO muestra botón Limpiar filtros cuando no hay filtros activos", () => {
    render(<SalesToolbar {...baseProps} />);
    expect(screen.queryByRole("button", { name: /Limpiar filtros/i })).not.toBeInTheDocument();
  });

  it("muestra botón Limpiar filtros cuando hay filtros activos", () => {
    render(<SalesToolbar {...baseProps} statusFilter={["completed"]} />);
    expect(screen.getByRole("button", { name: /Limpiar filtros/i })).toBeInTheDocument();
  });
});
