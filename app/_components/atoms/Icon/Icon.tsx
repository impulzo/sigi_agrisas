import { cn } from "../../../_lib/cn";
import type { IconName } from "./icons";

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size, className }: IconProps) {
  return (
    <span
      className={cn("material-symbols-outlined", className)}
      style={size ? { fontSize: `${size}px` } : undefined}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
