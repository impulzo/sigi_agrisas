"use client";

import { Icon } from "../../../_components/atoms/Icon/Icon";

interface Props {
  isExporting: boolean;
  onClick: () => void;
}

export function ExportPdfButton({ isExporting, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isExporting}
      className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-body-sm text-on-primary hover:bg-primary/90 disabled:opacity-50"
    >
      <Icon name="receipt_long" size={18} />
      {isExporting ? "Generando…" : "Exportar PDF"}
    </button>
  );
}
