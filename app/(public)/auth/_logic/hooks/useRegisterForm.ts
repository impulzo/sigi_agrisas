"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerSchema } from "../schemas/register.schema";
import { register } from "../services/register";
import { EmailAlreadyExistsError, NetworkError } from "../types/domain";

interface FormValues {
  name: string;
  email: string;
  password: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
}

interface UseRegisterFormReturn {
  values: FormValues;
  errors: FormErrors;
  isSubmitting: boolean;
  formError: string | null;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function useRegisterForm(): UseRegisterFormReturn {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function validateField(name: keyof FormValues, value: string): string | undefined {
    const result = registerSchema.safeParse({ ...values, [name]: value });
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
    const result = registerSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const { accessToken } = await register(values);
      sessionStorage.setItem("accessToken", accessToken);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof EmailAlreadyExistsError) {
        setFormError("Este correo ya está registrado");
      } else if (err instanceof NetworkError) {
        setFormError("Error al crear la cuenta. Intenta de nuevo.");
      } else {
        setFormError("Error al crear la cuenta. Intenta de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return { values, errors, isSubmitting, formError, handleChange, handleBlur, handleSubmit };
}
