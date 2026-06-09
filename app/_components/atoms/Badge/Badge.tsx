import { ReactNode } from "react";
import { cn } from "../../../_lib/cn";

type BadgeVariant = "read" | "write" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  read: "bg-tertiary-container text-on-tertiary-container",
  write: "bg-secondary-container text-on-secondary-container",
  neutral: "bg-surface-container-high text-on-surface",
};

export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
