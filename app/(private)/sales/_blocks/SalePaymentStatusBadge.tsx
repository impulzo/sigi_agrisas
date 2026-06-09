import { cn } from "../../../_lib/cn";

type SalePaymentStatus = "paid" | "partial" | "pending";

const statusConfig: Record<SalePaymentStatus, { label: string; dotClass: string; className: string }> = {
  paid: {
    label: "Pagado",
    dotClass: "bg-green-600",
    className: "bg-green-100 text-green-800",
  },
  partial: {
    label: "Parcial",
    dotClass: "bg-yellow-500",
    className: "bg-yellow-100 text-yellow-800",
  },
  pending: {
    label: "Pendiente",
    dotClass: "bg-red-500",
    className: "bg-red-100 text-red-800",
  },
};

interface SalePaymentStatusBadgeProps {
  status: SalePaymentStatus;
  isCredit: boolean;
  className?: string;
}

export function SalePaymentStatusBadge({ status, isCredit, className }: SalePaymentStatusBadgeProps) {
  if (!isCredit) return null;
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
