import { cn } from "../../../_lib/cn";

type SaleStatus = "completed" | "cancelled" | "edited" | "returned_total";

const statusConfig: Record<SaleStatus, { label: string; className: string }> = {
  completed: {
    label: "Completada",
    className: "bg-green-100 text-green-800",
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-red-100 text-red-800",
  },
  edited: {
    label: "Editada",
    className: "bg-amber-100 text-amber-800",
  },
  returned_total: {
    label: "Devuelto total",
    className: "bg-error-container text-on-error-container",
  },
};

interface SaleStatusBadgeProps {
  status: SaleStatus;
  className?: string;
}

export function SaleStatusBadge({ status, className }: SaleStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
