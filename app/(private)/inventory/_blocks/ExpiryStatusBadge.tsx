import { cn } from "../../../_lib/cn";

type ExpiryStatus = "ok" | "warning" | "critical";

const statusConfig: Record<ExpiryStatus, { label: string; dotClass: string; className: string }> = {
  ok: {
    label: "Vigente",
    dotClass: "bg-green-600",
    className: "bg-green-100 text-green-800",
  },
  warning: {
    label: "Por vencer",
    dotClass: "bg-yellow-500",
    className: "bg-yellow-100 text-yellow-800",
  },
  critical: {
    label: "Vence pronto",
    dotClass: "bg-red-500",
    className: "bg-red-100 text-red-800",
  },
};

interface ExpiryStatusBadgeProps {
  status: ExpiryStatus | null;
  className?: string;
}

export function ExpiryStatusBadge({ status, className }: ExpiryStatusBadgeProps) {
  if (!status) return null;
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
