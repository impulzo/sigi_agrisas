"use client";

import { Icon } from "../../../_components/atoms/Icon/Icon";

interface Props {
  isExporting: boolean;
  onClick: () => void;
}

export function ExportXlsxButton({ isExporting, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isExporting}
      className="flex items-center gap-2 rounded-full border border-outline-variant px-4 py-2 text-body-sm text-on-surface hover:bg-surface-container disabled:opacity-50"
    >
      <Icon name="summarize" size={18} />
      {isExporting ? "Generando…" : "Exportar Excel"}
    </button>
  );
}
