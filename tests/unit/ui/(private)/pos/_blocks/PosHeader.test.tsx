/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

jest.mock("../../../../../../app/_components/molecules/SegmentedButton/SegmentedButton", () => ({
  SegmentedButton: ({ value, options, onChange, "aria-label": ariaLabel }: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
    "aria-label"?: string;
  }) => (
    <div role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("../../../../../../app/_components/molecules/ConfirmDialog/ConfirmDialog", () => ({
  ConfirmDialog: ({ open, onConfirm, onCancel, description }: {
    open: boolean; onConfirm: () => void; onCancel: () => void; description: string;
  }) =>
    open ? (
      <div role="dialog">
        <p>{description}</p>
        <button onClick={onConfirm}>Confirmar</button>
        <button onClick={onCancel}>Cancelar</button>
      </div>
    ) : null,
}));

const mockFixWorkingBranch = jest.fn();
const mockOfflineSyncValue: {
  isOnline: boolean;
  offlineEnabled: boolean;
  ownerBranchId: string | null;
  blockedByPendingOutbox: boolean;
  pendingCount: number;
  syncing: boolean;
  catalogStalenessMs: number | null;
  refreshCatalogNow: () => Promise<void>;
  fixWorkingBranch: (branchId: string) => Promise<void>;
} = {
  isOnline: true,
  offlineEnabled: false,
  ownerBranchId: null,
  blockedByPendingOutbox: false,
  pendingCount: 0,
  syncing: false,
  catalogStalenessMs: null,
  refreshCatalogNow: jest.fn(),
  fixWorkingBranch: mockFixWorkingBranch,
};

jest.mock("../../../../../../app/(private)/_blocks/OfflineSyncProvider", () => ({
  useOfflineSync: () => mockOfflineSyncValue,
}));

import { PosHeader } from "../../../../../../app/(private)/pos/_blocks/PosHeader";
import type { BranchOption } from "../../../../../../app/(private)/pos/_logic/types/api";

const branches: BranchOption[] = [
  { id: "b1", name: "Sucursal A", code: "SA", isHeadquarters: false },
];

const baseProps = {
  branches,
  selectedBranchId: "b1",
  onBranchChange: jest.fn(),
  cartHasItems: false,
  onClearCart: jest.fn(),
  isBypass: false,
};

describe("PosHeader — SegmentedButton", () => {
  it("NO muestra SegmentedButton cuando canQuote=false", () => {
    render(<PosHeader {...baseProps} canQuote={false} onModeChange={jest.fn()} mode="sale" />);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("NO muestra SegmentedButton cuando onModeChange no está provisto", () => {
    render(<PosHeader {...baseProps} canQuote={true} mode="sale" />);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("muestra SegmentedButton cuando canQuote=true y onModeChange está provisto", () => {
    render(<PosHeader {...baseProps} canQuote={true} onModeChange={jest.fn()} mode="sale" />);
    expect(screen.getByRole("tablist", { name: "Modo de operación" })).toBeInTheDocument();
  });

  it("cambiar modo sin carrito invoca onModeChange directamente", () => {
    const onModeChange = jest.fn();
    render(
      <PosHeader
        {...baseProps}
        canQuote={true}
        onModeChange={onModeChange}
        mode="sale"
        cartHasItems={false}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Cotización" }));
    expect(onModeChange).toHaveBeenCalledWith("quote");
  });

  it("cambiar modo con carrito abre ConfirmDialog", () => {
    const onModeChange = jest.fn();
    render(
      <PosHeader
        {...baseProps}
        canQuote={true}
        onModeChange={onModeChange}
        mode="sale"
        cartHasItems={true}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Cotización" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onModeChange).not.toHaveBeenCalled();
  });

  it("al confirmar en el dialog, invoca onModeChange y onClearCart", () => {
    const onModeChange = jest.fn();
    const onClearCart = jest.fn();
    render(
      <PosHeader
        {...baseProps}
        canQuote={true}
        onModeChange={onModeChange}
        mode="sale"
        cartHasItems={true}
        onClearCart={onClearCart}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Cotización" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onClearCart).toHaveBeenCalled();
    expect(onModeChange).toHaveBeenCalledWith("quote");
  });

  it("al cancelar en el dialog, NO invoca onModeChange", () => {
    const onModeChange = jest.fn();
    render(
      <PosHeader
        {...baseProps}
        canQuote={true}
        onModeChange={onModeChange}
        mode="sale"
        cartHasItems={true}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Cotización" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onModeChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("PosHeader — fijar sucursal offline", () => {
  beforeEach(() => {
    mockFixWorkingBranch.mockReset();
    mockOfflineSyncValue.isOnline = true;
    mockOfflineSyncValue.ownerBranchId = null;
  });

  it("muestra el mensaje de error cuando fixWorkingBranch rechaza", async () => {
    mockFixWorkingBranch.mockRejectedValue(
      new Error("No se puede cambiar de sucursal de trabajo: hay ventas o cotizaciones sin sincronizar.")
    );
    render(<PosHeader {...baseProps} isBypass={true} canQuote={false} mode="sale" />);

    fireEvent.click(screen.getByRole("button", { name: "Fijar sucursal offline" }));

    expect(
      await screen.findByText("No se puede cambiar de sucursal de trabajo: hay ventas o cotizaciones sin sincronizar.")
    ).toBeInTheDocument();
  });

  it("limpia el mensaje de error tras un intento exitoso posterior", async () => {
    mockFixWorkingBranch.mockRejectedValueOnce(new Error("hay pendientes"));
    render(<PosHeader {...baseProps} isBypass={true} canQuote={false} mode="sale" />);

    fireEvent.click(screen.getByRole("button", { name: "Fijar sucursal offline" }));
    expect(await screen.findByText("hay pendientes")).toBeInTheDocument();

    mockFixWorkingBranch.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole("button", { name: "Fijar sucursal offline" }));

    await waitFor(() => expect(screen.queryByText("hay pendientes")).not.toBeInTheDocument());
  });
});
