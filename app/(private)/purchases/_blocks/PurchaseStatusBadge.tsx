import { cn } from "../../../_lib/cn";
import type { PurchaseStatus } from "../_logic/types/api";

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
