"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginSchema } from "../schemas/login.schema";
import { login } from "../services/login";
import { InvalidCredentialsError, NetworkError } from "../types/domain";

interface FormValues {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

interface UseLoginFormReturn {
  values: FormValues;
  errors: FormErrors;
  isSubmitting: boolean;
  formError: string | null;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function useLoginForm(): UseLoginFormReturn {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function validateField(name: keyof FormValues, value: string): string | undefined {
    const result = loginSchema.safeParse({ ...values, [name]: value });
    if (result.success) return undefined;
    const fieldError = result.error.flatten().fieldErrors[name];
    return fieldError?.[0];
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setFormError(null);
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    const error = validateField(name as keyof FormValues, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = loginSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const { accessToken } = await login(values);
      sessionStorage.setItem("accessToken", accessToken);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        setFormError("Credenciales inválidas");
      } else if (err instanceof NetworkError) {
        setFormError("Error al iniciar sesión. Intenta de nuevo.");
      } else {
        setFormError("Error al iniciar sesión. Intenta de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return { values, errors, isSubmitting, formError, handleChange, handleBlur, handleSubmit };
}
