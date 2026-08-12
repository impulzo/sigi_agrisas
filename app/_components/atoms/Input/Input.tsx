import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../../../_lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded border border-outline bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
          "disabled:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60",
          "transition-colors duration-150",
          error && "border-error focus:ring-error focus:border-error",
          className
        )}
        aria-invalid={!!error}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
