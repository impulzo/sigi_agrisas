import { cn } from "../../../_lib/cn";
import type { WaybillType } from "../_logic/types/api";

const typeConfig: Record<WaybillType, { label: string; dotClass: string; className: string }> = {
  simple: {
    label: "Simple",
    dotClass: "bg-on-surface-variant",
    className: "bg-surface-container-highest text-on-surface-variant",
  },
  carta_porte: {
    label: "Carta Porte",
    dotClass: "bg-secondary",
    className: "bg-secondary-container text-on-secondary-container",
  },
};

interface WaybillTypeBadgeProps {
  type: WaybillType;
  className?: string;
}

export function WaybillTypeBadge({ type, className }: WaybillTypeBadgeProps) {
  const config = typeConfig[type];
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
