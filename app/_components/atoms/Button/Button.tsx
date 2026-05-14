import { ButtonHTMLAttributes } from "react";
import { cn } from "../../../_lib/cn";
import { Spinner } from "../Spinner/Spinner";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "primary";
}

export function Button({
  loading = false,
  variant = "primary",
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
        "transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2",
        variant === "primary" && styles.primary,
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
