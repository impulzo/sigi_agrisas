"use client";

import Link from "next/link";
import { FormField } from "../../../_components/molecules/FormField/FormField";
import { Button } from "../../../_components/atoms/Button/Button";
import { useRegisterForm } from "../_logic/hooks/useRegisterForm";

export function RegisterForm() {
  const { values, errors, isSubmitting, formError, handleChange, handleBlur, handleSubmit } =
    useRegisterForm();

  return (
    <div>
      <h2 className="font-poppins text-2xl font-bold text-agrisas-dark mb-6">
        Crear cuenta
      </h2>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          id="name"
          name="name"
          label="Nombre completo"
          type="text"
          autoComplete="name"
          value={values.name}
          error={errors.name}
          onChange={handleChange}
          onBlur={handleBlur}
        />

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
          autoComplete="new-password"
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
          Crear cuenta
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/auth/login" className="text-agrisas-medium hover:underline font-medium">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
