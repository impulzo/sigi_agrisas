import { cn } from "../../../_lib/cn";
import type { PaymentStatus } from "../_logic/types/domain";

const statusConfig: Record<PaymentStatus, { label: string; dotClass: string; className: string }> = {
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

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
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
