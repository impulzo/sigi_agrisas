"use client";

import Link from "next/link";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import type { QuoteDetail } from "../_logic/types/domain";

interface QuoteActionsBarProps {
  quote: QuoteDetail;
  can: (perm: string) => boolean | "loading";
  isSaving: boolean;
  onAuthorize: () => void;
  onCancel: () => void;
  onConvert: () => void;
}

export function QuoteActionsBar({
  quote,
  can,
  isSaving,
  onAuthorize,
  onCancel,
  onConvert,
}: QuoteActionsBarProps) {
  const { status, isExpired, id, convertedSaleId } = quote;

  const canAuthorize = can("quotes:authorize");
  const canWrite = can("quotes:write");
  const canCancel = can("quotes:cancel");
  const canConvert = can("quotes:convert");

  if (canAuthorize === "loading" || canWrite === "loading" || canCancel === "loading" || canConvert === "loading") {
    return (
      <div className="flex gap-2">
        <Spinner size="sm" />
      </div>
    );
  }

  if (status === "converted") {
    if (convertedSaleId) {
      return (
        <div className="flex gap-3">
          <Link
            href={`/sales/${convertedSaleId}`}
            className="rounded-full bg-primary-container text-on-primary-container px-4 py-2 text-label-lg font-medium hover:bg-primary-container/80 transition-colors"
          >
            Ver venta generada
          </Link>
        </div>
      );
    }
    return null;
  }

  if (status === "cancelled") {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {status === "draft" && canAuthorize === true && (
        <button
          type="button"
          onClick={onAuthorize}
          disabled={isSaving || isExpired}
          title={isExpired ? "Extiende la fecha de vencimiento primero" : undefined}
          className="rounded-full bg-primary text-on-primary px-4 py-2 text-label-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving && <Spinner size="sm" />}
          Autorizar
        </button>
      )}

      {status === "draft" && canWrite === true && (
        <Link
          href={`/quotes/${id}/edit`}
          className="rounded-full border border-outline px-4 py-2 text-label-lg font-medium hover:bg-surface-container-low transition-colors"
        >
          Editar
        </Link>
      )}

      {status === "authorized" && canConvert === true && (
        <button
          type="button"
          onClick={onConvert}
          disabled={isSaving || isExpired}
          title={isExpired ? "Cotización vencida — cancela y crea otra" : undefined}
          className="rounded-full bg-primary text-on-primary px-4 py-2 text-label-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving && <Spinner size="sm" />}
          Convertir a venta
        </button>
      )}

      {(status === "draft" || status === "authorized") && canCancel === true && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-full border border-error text-error px-4 py-2 text-label-lg font-medium hover:bg-error-container/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving && <Spinner size="sm" />}
          Cancelar
        </button>
      )}
    </div>
  );
}
