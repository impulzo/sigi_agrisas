import { InputHTMLAttributes } from "react";
import { Input } from "../../atoms/Input/Input";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  id: string;
}

export function FormField({ label, error, id, ...inputProps }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-label-lg text-on-surface-variant">
        {label}
      </label>
      <Input id={id} error={error} {...inputProps} />
      {error && (
        <span role="alert" className="text-label-md text-error mt-1">
          {error}
        </span>
      )}
    </div>
  );
}
