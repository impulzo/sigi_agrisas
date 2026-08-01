import { cn } from "../../../_lib/cn";
import type { WaybillStatus } from "../_logic/types/api";

const statusConfig: Record<WaybillStatus, { label: string; dotClass: string; className: string }> = {
  completed: {
    label: "Completado",
    dotClass: "bg-primary",
    className: "bg-primary-container text-on-primary-container",
  },
  cancelled: {
    label: "Cancelado",
    dotClass: "bg-on-surface-variant",
    className: "bg-surface-container-highest text-on-surface-variant",
  },
};

interface WaybillStatusBadgeProps {
  status: WaybillStatus;
  className?: string;
}

export function WaybillStatusBadge({ status, className }: WaybillStatusBadgeProps) {
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
