"use client";

import type { Invoice } from "../_logic/types/domain";

interface InvoiceActionsBarProps {
  invoice: Invoice;
  canCancel: boolean | "loading";
  isDownloading: boolean;
  isSaving: boolean;
  onDownload: (format: "pdf" | "xml") => void;
  onCancelClick: () => void;
}

export function InvoiceActionsBar({
  invoice: inv,
  canCancel,
  isDownloading,
  isSaving,
  onDownload,
  onCancelClick,
}: InvoiceActionsBarProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-end">
      <button
        type="button"
        onClick={() => onDownload("pdf")}
        disabled={isDownloading}
        className="rounded-full border border-outline px-4 py-2 text-label-sm font-medium hover:bg-surface-container transition-colors disabled:opacity-50"
      >
        {isDownloading ? "Descargando..." : "Descargar PDF"}
      </button>
      <button
        type="button"
        onClick={() => onDownload("xml")}
        disabled={isDownloading}
        className="rounded-full border border-outline px-4 py-2 text-label-sm font-medium hover:bg-surface-container transition-colors disabled:opacity-50"
      >
        {isDownloading ? "Descargando..." : "Descargar XML"}
      </button>
      {inv.status === "stamped" && canCancel === true && (
        <button
          type="button"
          onClick={onCancelClick}
          disabled={isSaving}
          className="rounded-full border border-error text-error px-4 py-2 text-label-sm font-medium hover:bg-error/5 transition-colors disabled:opacity-50"
        >
          Cancelar CFDI
        </button>
      )}
    </div>
  );
}
