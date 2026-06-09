"use client";

import { useState } from "react";
import { ConfirmDialog } from "../../../_components/molecules/ConfirmDialog/ConfirmDialog";
import { SegmentedButton } from "../../../_components/molecules/SegmentedButton/SegmentedButton";
import type { BranchOption } from "../_logic/types/api";

type PosMode = "sale" | "quote";

interface PosHeaderProps {
  branches: BranchOption[];
  selectedBranchId: string;
  onBranchChange: (id: string) => void;
  cartHasItems: boolean;
  onClearCart: () => void;
  isBypass: boolean;
  mode?: PosMode;
  onModeChange?: (mode: PosMode) => void;
  canQuote?: boolean;
}

export function PosHeader({
  branches,
  selectedBranchId,
  onBranchChange,
  cartHasItems,
  onClearCart,
  isBypass,
  mode = "sale",
  onModeChange,
  canQuote = false,
}: PosHeaderProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState<PosMode | null>(null);

  function handleModeChange(newMode: PosMode) {
    if (newMode === mode) return;
    if (cartHasItems) {
      setPendingMode(newMode);
      setShowConfirm(true);
    } else {
      onModeChange?.(newMode);
    }
  }

  return (
    <header className="sticky top-0 z-10 bg-surface border-b border-outline-variant px-4 py-3 flex items-center gap-4">
      <h1 className="text-title-md font-semibold text-on-surface shrink-0">Punto de Venta</h1>

      {canQuote && onModeChange && (
        <SegmentedButton
          value={mode}
          options={[
            { value: "sale", label: "Venta" },
            { value: "quote", label: "Cotización" },
          ]}
          onChange={handleModeChange}
          aria-label="Modo de operación"
        />
      )}

      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isBypass || branches.length > 1 ? (
          <select
            value={selectedBranchId}
            onChange={(e) => onBranchChange(e.target.value)}
            className="rounded-lg border border-outline px-3 py-1.5 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            aria-label="Sucursal"
          >
            <option value="">— Selecciona sucursal —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        ) : branches.length === 1 ? (
          <span className="text-body-sm text-on-surface-variant">{branches[0].name}</span>
        ) : null}
      </div>

      {cartHasItems && (
        <>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="shrink-0 text-label-sm text-error hover:text-error/80 transition-colors"
          >
            Limpiar carrito
          </button>
        </>
      )}

      <ConfirmDialog
        open={showConfirm}
        title={pendingMode ? "Cambiar modo" : "Limpiar carrito"}
        description={
          pendingMode
            ? "Se eliminarán las líneas actuales del carrito al cambiar de modo. ¿Continuar?"
            : "Se eliminarán todos los productos del carrito. ¿Continuar?"
        }
        confirmLabel={pendingMode ? "Cambiar" : "Limpiar"}
        cancelLabel="Cancelar"
        onConfirm={() => {
          onClearCart();
          if (pendingMode) onModeChange?.(pendingMode);
          setPendingMode(null);
          setShowConfirm(false);
        }}
        onCancel={() => {
          setPendingMode(null);
          setShowConfirm(false);
        }}
      />
    </header>
  );
}
