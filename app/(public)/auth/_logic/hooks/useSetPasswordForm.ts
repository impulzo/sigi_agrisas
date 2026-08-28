"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setPasswordSchema } from "../schemas/setPassword.schema";
import { setPassword } from "../services/setPassword";
import { NetworkError, PasswordSetupTokenExpiredError, PasswordSetupTokenInvalidError } from "../types/domain";
import { setAccessToken } from "../../../../_lib/session/accessToken";

interface FormValues {
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  password?: string;
  confirmPassword?: string;
}

interface UseSetPasswordFormReturn {
  values: FormValues;
  errors: FormErrors;
  isSubmitting: boolean;
  formError: string | null;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function useSetPasswordForm(token: string | null): UseSetPasswordFormReturn {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      setFormError("Enlace inválido: falta el token. Revisa el correo que recibiste.");
      return;
    }

    const result = setPasswordSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        password: fieldErrors.password?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
      });
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const { accessToken } = await setPassword({ token, password: result.data.password });
      setAccessToken(accessToken);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof PasswordSetupTokenExpiredError || err instanceof PasswordSetupTokenInvalidError) {
        setFormError(err.message);
      } else if (err instanceof NetworkError) {
        setFormError("Error al establecer la contraseña. Intenta de nuevo.");
      } else {
        setFormError("Error al establecer la contraseña. Intenta de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return { values, errors, isSubmitting, formError, handleChange, handleSubmit };
}
