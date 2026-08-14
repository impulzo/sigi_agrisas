"use client";

import { useState } from "react";
import { Icon } from "../../../../_components/atoms/Icon/Icon";
import { ConfirmDialog } from "../../../../_components/molecules/ConfirmDialog/ConfirmDialog";

interface RebuildArticleButtonProps {
  disabled: boolean;
  isRebuilding: boolean;
  onRebuild: () => Promise<void>;
}

export function RebuildArticleButton({ disabled, isRebuilding, onRebuild }: RebuildArticleButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleConfirm() {
    setConfirmOpen(false);
    await onRebuild();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={disabled || isRebuilding}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-outline text-on-surface text-label-lg font-medium hover:bg-surface-container transition-colors disabled:opacity-50"
      >
        <Icon name="restore" size={18} />
        {isRebuilding ? "Reconstruyendo…" : "Reconstruir Artículo"}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Reconstruir saldos del artículo?"
        description="Recalcula el saldo acumulado de este producto en la sucursal seleccionada a partir de su historial de movimientos. No es reversible salvo repitiendo el cálculo."
        confirmLabel="Reconstruir"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
