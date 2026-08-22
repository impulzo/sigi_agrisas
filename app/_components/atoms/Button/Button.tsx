import { ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "../../../_lib/cn";
import { Spinner } from "../Spinner/Spinner";
import { Icon } from "../Icon/Icon";
import type { IconName } from "../Icon/icons";

type Variant = "filled" | "tonal" | "outlined" | "text" | "destructive";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  filled: "bg-primary text-on-primary hover:bg-primary/90",
  tonal: "bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim",
  outlined: "border border-outline text-on-surface hover:bg-surface-container",
  text: "text-primary hover:bg-primary-fixed/20",
  destructive: "bg-error-container text-on-error-container hover:bg-error/10",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-label-md",
  md: "px-4 py-2 text-label-lg",
  lg: "px-6 py-3 text-title-md",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: IconName;
  iconPosition?: "start" | "end";
  href?: string;
}

export function Button({
  variant = "filled",
  size = "md",
  loading = false,
  icon,
  iconPosition = "start",
  disabled,
  children,
  className,
  href,
  ...props
}: ButtonProps) {
  const iconNode = icon && !loading ? <Icon name={icon} size={18} /> : null;

  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium",
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    sizeClasses[size],
    variantClasses[variant],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {iconNode && iconPosition === "start" && iconNode}
        {children}
        {iconNode && iconPosition === "end" && iconNode}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {iconNode && iconPosition === "start" && iconNode}
      {children}
      {iconNode && iconPosition === "end" && iconNode}
    </button>
  );
}
