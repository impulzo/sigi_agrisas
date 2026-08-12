import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "../../../_lib/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            "w-full appearance-none rounded border border-outline bg-surface-container-lowest px-3 py-2 pr-9 text-body-md text-on-surface",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
            "disabled:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60",
            "transition-colors duration-150",
            error && "border-error focus:ring-error focus:border-error",
            className
          )}
          aria-invalid={!!error}
          {...props}
        >
          {children}
        </select>
        <span
          className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
          style={{ fontSize: "18px" }}
          aria-hidden="true"
        >
          expand_more
        </span>
      </div>
    );
  }
);

Select.displayName = "Select";
