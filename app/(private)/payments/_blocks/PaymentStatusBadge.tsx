import { cn } from "../../../_lib/cn";
import type { PaymentStatus, SalePaymentStatus } from "../_logic/types/domain";

type PaymentBadgeState = "active" | "cancelled" | "completed";

const statusConfig: Record<PaymentBadgeState, { label: string; dotClass: string; className: string }> = {
  active: {
    label: "Activo",
    dotClass: "bg-amber-500",
    className: "bg-amber-100 text-amber-800",
  },
  completed: {
    label: "Completado",
    dotClass: "bg-green-600",
    className: "bg-green-100 text-green-800",
  },
  cancelled: {
    label: "Cancelado",
    dotClass: "bg-on-surface-variant",
    className: "bg-surface-container-highest text-on-surface-variant",
  },
};

/** "Completado" solo cuando la venta llega a salePaymentStatus="paid"; abono activo con venta parcial/pendiente muestra "Activo". */
function computeBadgeState(status: PaymentStatus, salePaymentStatus: SalePaymentStatus): PaymentBadgeState {
  if (status === "cancelled") return "cancelled";
  return salePaymentStatus === "paid" ? "completed" : "active";
}

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  salePaymentStatus: SalePaymentStatus;
  className?: string;
}

export function PaymentStatusBadge({ status, salePaymentStatus, className }: PaymentStatusBadgeProps) {
  const config = statusConfig[computeBadgeState(status, salePaymentStatus)];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-label-sm font-medium",
        config.className,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", config.dotClass)} />
      {config.label}
    </span>
  );
}
