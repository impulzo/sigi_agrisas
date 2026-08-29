"use client";

import { FormField } from "../../../_components/molecules/FormField/FormField";
import { Button } from "../../../_components/atoms/Button/Button";
import { useSetPasswordForm } from "../_logic/hooks/useSetPasswordForm";

interface SetPasswordFormProps {
  token: string | null;
}

export function SetPasswordForm({ token }: SetPasswordFormProps) {
  const { values, errors, isSubmitting, formError, handleChange, handleSubmit } =
    useSetPasswordForm(token);

  return (
    <div>
      <h2 className="font-poppins text-2xl font-bold text-agrisas-dark mb-6">
        Establece tu contraseña
      </h2>

      {!token && (
        <p role="alert" className="text-sm text-red-500 mb-4">
          Este enlace no incluye un token válido. Revisa el correo que recibiste.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          id="password"
          name="password"
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          value={values.password}
          error={errors.password}
          onChange={handleChange}
          className="focus:ring-agrisas-medium focus:border-agrisas-medium"
        />

        <FormField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          error={errors.confirmPassword}
          onChange={handleChange}
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
          disabled={!token}
          className="w-full mt-2 rounded bg-agrisas-dark text-agrisas-mint hover:bg-agrisas-medium"
        >
          Establecer contraseña
        </Button>
      </form>
    </div>
  );
}
