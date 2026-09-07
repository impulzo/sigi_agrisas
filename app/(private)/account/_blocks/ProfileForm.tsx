"use client";

import { useState, useEffect } from "react";
import { Card } from "../../../_components/molecules/Card/Card";
import { FormField } from "../../../_components/molecules/FormField/FormField";
import { Button } from "../../../_components/atoms/Button/Button";
import { emailFieldSchema } from "../_logic/schemas/updateProfile.schema";
import type { OwnProfileDto } from "../_logic/types/api";

interface ProfileFormProps {
  profile: OwnProfileDto;
  onChange: (updated: OwnProfileDto) => void;
  isSavingProfile: boolean;
  profileError: string | null;
  profileFieldErrors: { email?: string };
  clearProfileError: () => void;
  saveProfileDiff: (params: {
    original: OwnProfileDto;
    edited: { name: string; email: string };
  }) => Promise<OwnProfileDto | null>;
}

export function ProfileForm({
  profile,
  onChange,
  isSavingProfile,
  profileError,
  profileFieldErrors,
  clearProfileError,
  saveProfileDiff,
}: ProfileFormProps) {
  const [name, setName] = useState(profile.name ?? "");
  const [email, setEmail] = useState(profile.email);

  useEffect(() => {
    setName(profile.name ?? "");
    setEmail(profile.email);
  }, [profile]);

  const emailValidation = emailFieldSchema.safeParse(email);
  const emailFormatError = !emailValidation.success ? emailValidation.error.errors[0].message : undefined;
  const emailError = profileFieldErrors.email ?? emailFormatError;

  const isDirty = name !== (profile.name ?? "") || email !== profile.email;
  const canSave = isDirty && emailValidation.success && name.trim() !== "";

  function handleEmailChange(value: string) {
    setEmail(value);
    if (profileFieldErrors.email) clearProfileError();
  }

  async function handleSave() {
    if (!canSave) return;
    clearProfileError();
    const updated = await saveProfileDiff({ original: profile, edited: { name, email } });
    if (updated) onChange(updated);
  }

  return (
    <Card>
      <div className="flex flex-col gap-md">
        <h2 className="text-title-md font-semibold text-on-surface">Datos de cuenta</h2>

        <FormField id="account-name" label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <FormField
          id="account-email"
          label="Correo"
          type="email"
          value={email}
          onChange={(e) => handleEmailChange(e.target.value)}
          error={emailError}
        />
        {email !== profile.email && !emailError && (
          <p className="text-label-sm text-on-surface-variant -mt-2">
            El cambio de correo se reflejará en la barra superior al volver a iniciar sesión.
          </p>
        )}

        {profileError && (
          <div className="rounded bg-error-container/30 px-3 py-2 text-body-sm text-error flex items-center justify-between gap-2">
            {profileError}
            <Button variant="text" size="sm" onClick={clearProfileError} className="flex-shrink-0">
              Cerrar
            </Button>
          </div>
        )}

        <div>
          <Button onClick={handleSave} disabled={!canSave} loading={isSavingProfile}>
            Guardar cambios
          </Button>
        </div>
      </div>
    </Card>
  );
}
