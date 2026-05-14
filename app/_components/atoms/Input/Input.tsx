import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../../../_lib/cn";
import styles from "./Input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-md border border-gray-300 px-3 py-2 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-agrisas-medium focus:border-agrisas-medium",
          "disabled:bg-gray-50 disabled:cursor-not-allowed",
          "transition-colors duration-150",
          error && styles.error,
          className
        )}
        aria-invalid={!!error}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
