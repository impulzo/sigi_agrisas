import type { PaymentDetail } from "../_logic/types/domain";

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
function fmt(n: number) { return MX.format(n); }
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short" }).format(d);
}

interface PaymentMetaPanelProps {
  payment: PaymentDetail;
}

export function PaymentMetaPanel({ payment }: PaymentMetaPanelProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 bg-surface-container-low rounded-2xl p-4">
      <div>
        <p className="text-label-sm text-on-surface-variant">Cliente</p>
        <p className="text-body-sm text-on-surface">{payment.customerName ?? "—"}</p>
      </div>
      <div>
        <p className="text-label-sm text-on-surface-variant">Cobrador</p>
        <p className="text-body-sm text-on-surface">{payment.userName ?? "—"}</p>
      </div>
      <div>
        <p className="text-label-sm text-on-surface-variant">Método de pago</p>
        <p className="text-body-sm text-on-surface">{payment.paymentMethodName ?? "—"}</p>
      </div>
      <div>
        <p className="text-label-sm text-on-surface-variant">Sucursal</p>
        <p className="text-body-sm text-on-surface">{payment.branchName ?? "—"}</p>
      </div>
      <div>
        <p className="text-label-sm text-on-surface-variant">Fecha</p>
        <p className="text-body-sm text-on-surface">{fmtDate(payment.createdAt)}</p>
      </div>
      <div>
        <p className="text-label-sm text-on-surface-variant">Monto</p>
        <p className="text-body-sm font-medium text-on-surface">{fmt(payment.amount)}</p>
      </div>
      {payment.notes && (
        <div className="col-span-2 sm:col-span-3">
          <p className="text-label-sm text-on-surface-variant">Notas</p>
          <p className="text-body-sm text-on-surface">{payment.notes}</p>
        </div>
      )}
      {payment.status === "cancelled" && payment.cancellationReason && (
        <div className="col-span-2 sm:col-span-3 bg-error-container/20 rounded-xl p-3">
          <p className="text-label-sm text-on-surface-variant">Motivo de cancelación</p>
          <p className="text-body-sm text-on-surface">{payment.cancellationReason}</p>
          {payment.cancelledAt && (
            <p className="text-label-sm text-on-surface-variant mt-1">
              Cancelado el {fmtDate(payment.cancelledAt)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
