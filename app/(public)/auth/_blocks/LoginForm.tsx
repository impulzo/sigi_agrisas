"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormField } from "../../../_components/molecules/FormField/FormField";
import { Button } from "../../../_components/atoms/Button/Button";
import { SessionReasonBanner } from "../../../_components/molecules/SessionReasonBanner/SessionReasonBanner";
import { useLoginForm } from "../_logic/hooks/useLoginForm";

const VALID_REASONS = ["inactivity", "session_lost"] as const;
type SessionReason = (typeof VALID_REASONS)[number];

export function LoginForm() {
  const { values, errors, isSubmitting, formError, handleChange, handleBlur, handleSubmit } =
    useLoginForm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReason = searchParams.get("reason");
  const reason: SessionReason | null =
    VALID_REASONS.includes(rawReason as SessionReason) ? (rawReason as SessionReason) : null;

  return (
    <div>
      <h2 className="font-poppins text-2xl font-bold text-agrisas-dark mb-6">
        Iniciar sesión
      </h2>

      {reason && (
        <SessionReasonBanner reason={reason} onDismiss={() => router.replace("/auth/login")} />
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          id="email"
          name="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          onChange={handleChange}
          onBlur={handleBlur}
          className="focus:ring-agrisas-medium focus:border-agrisas-medium"
        />

        <FormField
          id="password"
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          value={values.password}
          error={errors.password}
          onChange={handleChange}
          onBlur={handleBlur}
          className="focus:ring-agrisas-medium focus:border-agrisas-medium"
        />

        {formError && (
          <p role="alert" className="text-sm text-red-500">
            {formError}
          </p>
        )}

        <Button
          type="submit"
          loading={isSubmitting}
          className="w-full mt-2 rounded bg-agrisas-dark text-agrisas-mint hover:bg-agrisas-medium"
        >
          Ingresar
        </Button>
      </form>
    </div>
  );
}
