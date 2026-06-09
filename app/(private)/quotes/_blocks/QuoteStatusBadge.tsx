import { cn } from "../../../_lib/cn";

type QuoteStatusInput = "draft" | "authorized" | "converted" | "cancelled" | "expired";

interface StatusConfig {
  label: string;
  dotClass: string;
  bgClass: string;
  textClass: string;
}

const statusConfig: Record<QuoteStatusInput, StatusConfig> = {
  draft: {
    label: "Borrador",
    dotClass: "bg-outline",
    bgClass: "bg-surface-container-high",
    textClass: "text-on-surface-variant",
  },
  authorized: {
    label: "Autorizada",
    dotClass: "bg-secondary",
    bgClass: "bg-secondary-container",
    textClass: "text-on-secondary-container",
  },
  expired: {
    label: "Vencida",
    dotClass: "bg-error",
    bgClass: "bg-error-container",
    textClass: "text-on-error-container",
  },
  converted: {
    label: "Convertida",
    dotClass: "bg-primary",
    bgClass: "bg-primary-fixed-dim/20",
    textClass: "text-on-primary-fixed-variant",
  },
  cancelled: {
    label: "Cancelada",
    dotClass: "bg-outline-variant",
    bgClass: "bg-surface-container-highest",
    textClass: "text-on-surface-variant",
  },
};

interface QuoteStatusBadgeProps {
  status: "draft" | "authorized" | "converted" | "cancelled";
  isExpired: boolean;
  className?: string;
}

export function QuoteStatusBadge({ status, isExpired, className }: QuoteStatusBadgeProps) {
  const effectiveStatus: QuoteStatusInput =
    isExpired && status === "authorized" ? "expired" : status;
  const config = statusConfig[effectiveStatus];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-medium",
        config.bgClass,
        config.textClass,
        className,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", config.dotClass)} />
      {config.label}
    </span>
  );
}
