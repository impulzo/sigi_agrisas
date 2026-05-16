import { cn } from "../../../_lib/cn";
import { Icon } from "../Icon/Icon";
import type { IconName } from "../Icon/icons";

type Tone = "primary" | "success" | "warning" | "error";

interface ChipProps {
  label: string;
  tone?: Tone;
  icon?: IconName;
  className?: string;
}

const toneClasses: Record<Tone, string> = {
  primary: "bg-primary-fixed/20 text-primary",
  success: "bg-primary-container/20 text-on-primary-container",
  warning: "bg-secondary-container text-on-secondary-container",
  error: "bg-error-container text-on-error-container",
};

export function Chip({ label, tone = "primary", icon, className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-label-lg",
        toneClasses[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} className="text-[18px]" />}
      <span>{label}</span>
    </span>
  );
}
