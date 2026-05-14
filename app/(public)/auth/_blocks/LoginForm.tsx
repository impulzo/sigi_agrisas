"use client";

import Link from "next/link";
import { FormField } from "../../../_components/molecules/FormField/FormField";
import { Button } from "../../../_components/atoms/Button/Button";
import { useLoginForm } from "../_logic/hooks/useLoginForm";

export function LoginForm() {
  const { values, errors, isSubmitting, formError, handleChange, handleBlur, handleSubmit } =
    useLoginForm();

  return (
    <div>
      <h2 className="font-poppins text-2xl font-bold text-agrisas-dark mb-6">
        Iniciar sesión
      </h2>

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
        />

        {formError && (
          <p role="alert" className="text-sm text-red-500">
            {formError}
          </p>
        )}

        <Button type="submit" loading={isSubmitting} className="w-full mt-2">
          Ingresar
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        ¿No tienes cuenta?{" "}
        <Link href="/auth/register" className="text-agrisas-medium hover:underline font-medium">
          Regístrate aquí
        </Link>
      </p>
    </div>
  );
}
