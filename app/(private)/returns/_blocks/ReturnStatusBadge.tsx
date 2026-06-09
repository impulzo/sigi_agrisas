import { cn } from "../../../_lib/cn";
import type { ReturnStatus } from "../_logic/types/api";

const statusConfig: Record<ReturnStatus, { label: string; dotClass: string; className: string }> = {
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

interface ReturnStatusBadgeProps {
  status: ReturnStatus;
  className?: string;
}

export function ReturnStatusBadge({ status, className }: ReturnStatusBadgeProps) {
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
