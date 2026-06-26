/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("../../../../../app/_components/atoms/Icon/Icon", () => ({
  Icon: ({ name }: { name: string }) => <span data-icon={name} />,
}));

import { BillingToolbar } from "../../../../../app/(private)/billing/_blocks/BillingToolbar";

const noop = jest.fn();

function defaultProps(overrides = {}) {
  return {
    search: "",
    onSearchChange: noop,
    branchId: "",
    onBranchChange: noop,
    branches: [{ id: "b1", name: "Sucursal 1" }, { id: "b2", name: "Sucursal 2" }],
    showBranchFilter: false,
    statusFilter: undefined,
    onStatusChange: noop,
    from: "",
    to: "",
    onFromChange: noop,
    onToChange: noop,
    onReset: noop,
    ...overrides,
  };
}

describe("BillingToolbar — branch filter visibility", () => {
  beforeEach(() => jest.clearAllMocks());

  it("oculta filtro sucursal cuando showBranchFilter=false", () => {
    render(<BillingToolbar {...defaultProps({ showBranchFilter: false })} />);
    expect(screen.queryByRole("combobox", { name: /sucursal/i })).toBeNull();
  });

  it("muestra filtro sucursal cuando showBranchFilter=true", () => {
    render(<BillingToolbar {...defaultProps({ showBranchFilter: true })} />);
    expect(screen.getByRole("combobox", { name: /sucursal/i })).toBeInTheDocument();
  });

  it("filtro sucursal contiene las opciones de branches", () => {
    render(<BillingToolbar {...defaultProps({ showBranchFilter: true })} />);
    expect(screen.getByRole("option", { name: "Sucursal 1" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sucursal 2" })).toBeInTheDocument();
  });
});

describe("BillingToolbar — search min-chars warning", () => {
  beforeEach(() => jest.clearAllMocks());

  it("no muestra aviso cuando search está vacío", () => {
    render(<BillingToolbar {...defaultProps({ search: "" })} />);
    expect(screen.queryByText(/al menos 2 caracteres/i)).toBeNull();
  });

  it("no muestra aviso cuando search tiene ≥2 chars", () => {
    render(<BillingToolbar {...defaultProps({ search: "FA" })} />);
    expect(screen.queryByText(/al menos 2 caracteres/i)).toBeNull();
  });

  it("muestra aviso cuando search tiene exactamente 1 char", () => {
    render(<BillingToolbar {...defaultProps({ search: "F" })} />);
    expect(screen.getByText(/al menos 2 caracteres/i)).toBeInTheDocument();
  });
});

describe("BillingToolbar — status filter toggle", () => {
  beforeEach(() => jest.clearAllMocks());

  it("llama onStatusChange con 'stamped' al hacer click en Vigente", () => {
    const onStatusChange = jest.fn();
    render(<BillingToolbar {...defaultProps({ onStatusChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "Vigente" }));
    expect(onStatusChange).toHaveBeenCalledWith("stamped");
  });

  it("llama onStatusChange con undefined al hacer click en filtro ya activo (toggle off)", () => {
    const onStatusChange = jest.fn();
    render(<BillingToolbar {...defaultProps({ onStatusChange, statusFilter: "stamped" })} />);
    fireEvent.click(screen.getByRole("button", { name: "Vigente" }));
    expect(onStatusChange).toHaveBeenCalledWith(undefined);
  });

  it("llama onStatusChange con 'cancelled' al hacer click en Cancelada", () => {
    const onStatusChange = jest.fn();
    render(<BillingToolbar {...defaultProps({ onStatusChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelada" }));
    expect(onStatusChange).toHaveBeenCalledWith("cancelled");
  });
});

describe("BillingToolbar — limpiar filtros", () => {
  beforeEach(() => jest.clearAllMocks());

  it("botón limpiar oculto cuando no hay filtros activos", () => {
    render(<BillingToolbar {...defaultProps()} />);
    expect(screen.queryByRole("button", { name: /limpiar filtros/i })).toBeNull();
  });

  it("botón limpiar visible cuando hay search activo", () => {
    render(<BillingToolbar {...defaultProps({ search: "abc" })} />);
    expect(screen.getByRole("button", { name: /limpiar filtros/i })).toBeInTheDocument();
  });

  it("click en limpiar llama onReset", () => {
    const onReset = jest.fn();
    render(<BillingToolbar {...defaultProps({ search: "abc", onReset })} />);
    fireEvent.click(screen.getByRole("button", { name: /limpiar filtros/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
