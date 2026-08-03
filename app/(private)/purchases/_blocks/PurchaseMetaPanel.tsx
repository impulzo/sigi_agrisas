import type { PurchaseDetail } from "../_logic/types/domain";

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short" }).format(d);
}

interface PurchaseMetaPanelProps {
  purchase: PurchaseDetail;
}

export function PurchaseMetaPanel({ purchase }: PurchaseMetaPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 bg-surface-container-low rounded-2xl p-4">
        <div>
          <p className="text-label-sm text-on-surface-variant">Proveedor</p>
          <p className="text-body-sm text-on-surface">{purchase.providerName ?? "—"}</p>
          {purchase.providerRfc && (
            <p className="text-label-sm text-on-surface-variant">{purchase.providerRfc}</p>
          )}
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant">Sucursal</p>
          <p className="text-body-sm text-on-surface">{purchase.branchName ?? "—"}</p>
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant">Registrado por</p>
          <p className="text-body-sm text-on-surface">{purchase.creatorName ?? purchase.creatorId.slice(0, 8)}</p>
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant">Forma de pago</p>
          <p className="text-body-sm text-on-surface">
            {purchase.paymentMethodCode ?? "—"}{purchase.paymentMethodIsCredit ? " (crédito)" : ""}
          </p>
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant">Fecha de compra</p>
          <p className="text-body-sm text-on-surface">{fmtDate(purchase.purchasedAt)}</p>
        </div>
        {purchase.notes && (
          <div className="col-span-full">
            <p className="text-label-sm text-on-surface-variant mb-1">Notas</p>
            <p className="text-body-sm text-on-surface whitespace-pre-line">{purchase.notes}</p>
          </div>
        )}
      </div>

      {purchase.status === "cancelled" && purchase.cancelledAt && (
        <div className="bg-surface-container-highest text-on-surface-variant rounded-xl p-4 text-body-sm">
          <p className="font-medium text-on-surface mb-1">
            Cancelada el {fmtDate(purchase.cancelledAt)}
          </p>
          {purchase.cancelledBy && <p>Por: {purchase.cancelledBy}</p>}
          {purchase.cancellationReason && (
            <p className="mt-1">Motivo: {purchase.cancellationReason}</p>
          )}
        </div>
      )}
    </div>
  );
}
