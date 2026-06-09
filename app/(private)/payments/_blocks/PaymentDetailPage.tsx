"use client";

import Link from "next/link";
import { usePaymentDetail } from "../_logic/hooks/usePaymentDetail";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { PaymentMetaPanel } from "./PaymentMetaPanel";
import { PaymentActionsBar } from "./PaymentActionsBar";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import { Icon } from "../../../_components/atoms/Icon/Icon";

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
function fmt(n: number) { return MX.format(n); }

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PaymentDetailPageProps {
  id: string;
}

export function PaymentDetailPage({ id }: PaymentDetailPageProps) {
  const { payment, isLoading, error, refresh } = usePaymentDetail(
    UUID_REGEX.test(id) ? id : ""
  );

  if (!UUID_REGEX.test(id)) {
    return (
      <EmptyState
        icon="warning"
        title="ID inválido"
        description="El identificador del abono no es válido."
        action={
          <Link href="/payments" className="text-primary hover:underline text-body-sm">
            Volver a abonos
          </Link>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <EmptyState
        icon="warning"
        title="No se encontró el abono"
        description={error?.message ?? "El abono no existe o no tienes acceso."}
        action={
          <Link href="/payments" className="text-primary hover:underline text-body-sm">
            Volver a abonos
          </Link>
        }
      />
    );
  }

  const folioLabel = payment.folioPrefix
    ? `${payment.folioPrefix}${payment.folioNumber}`
    : String(payment.folioNumber);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/payments" className="text-on-surface-variant hover:text-on-surface">
              <Icon name="arrow_back" size={20} />
            </Link>
            <h1 className="text-headline-sm font-semibold text-on-surface font-mono">
              {folioLabel}
            </h1>
            <PaymentStatusBadge status={payment.status} />
            <span className="text-title-sm font-semibold tabular-nums text-on-surface">
              {fmt(payment.amount)}
            </span>
          </div>
          {payment.saleFolioCode && (
            <p className="text-body-sm text-on-surface-variant pl-9">
              Venta ·{" "}
              <Link href={`/sales/${payment.saleId}`} className="text-primary hover:underline">
                {payment.saleFolioCode}
              </Link>
            </p>
          )}
        </div>

        <PaymentActionsBar payment={payment} onCancelled={refresh} />
      </div>

      <PaymentMetaPanel payment={payment} />
    </div>
  );
}
