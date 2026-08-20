import { cn } from "../../../_lib/cn";
import type { PurchasePaymentStatus, PurchaseStatus } from "../_logic/types/api";

const statusConfig: Record<PurchaseStatus, { label: string; dotClass: string; className: string }> = {
  completed: {
    label: "Activa",
    dotClass: "bg-primary",
    className: "bg-primary-container text-on-primary-container",
  },
  cancelled: {
    label: "Cancelada",
    dotClass: "bg-on-surface-variant",
    className: "bg-surface-container-highest text-on-surface-variant",
  },
};

interface PurchaseStatusBadgeProps {
  status: PurchaseStatus;
  className?: string;
}

export function PurchaseStatusBadge({ status, className }: PurchaseStatusBadgeProps) {
  const config = statusConfig[status];
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

const paymentStatusConfig: Record<PurchasePaymentStatus, { label: string; dotClass: string; className: string }> = {
  pending: {
    label: "Pendiente",
    dotClass: "bg-error",
    className: "bg-error-container text-on-error-container",
  },
  partial: {
    label: "Parcial",
    dotClass: "bg-tertiary",
    className: "bg-tertiary-container text-on-tertiary-container",
  },
  paid: {
    label: "Pagado",
    dotClass: "bg-primary",
    className: "bg-primary-container text-on-primary-container",
  },
};

interface PurchasePaymentStatusBadgeProps {
  paymentStatus: PurchasePaymentStatus;
  className?: string;
}

export function PurchasePaymentStatusBadge({ paymentStatus, className }: PurchasePaymentStatusBadgeProps) {
  const config = paymentStatusConfig[paymentStatus];
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
