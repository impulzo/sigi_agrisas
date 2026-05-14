import { InputHTMLAttributes } from "react";
import { Input } from "../../atoms/Input/Input";
import styles from "./FormField.module.css";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  id: string;
}

export function FormField({ label, error, id, ...inputProps }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <Input id={id} error={error} {...inputProps} />
      {error && (
        <span role="alert" className={styles.errorMessage}>
          {error}
        </span>
      )}
    </div>
  );
}
