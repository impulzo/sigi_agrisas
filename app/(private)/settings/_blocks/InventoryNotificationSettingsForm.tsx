"use client";

import { useState, useEffect } from "react";
import { useInventoryNotificationSettingsMutations } from "../_logic/hooks/useInventoryNotificationSettingsMutations";
import type { InventoryNotificationSettingsDto } from "../_logic/types/api";
import { Button } from "../../../_components/atoms/Button/Button";

interface InventoryNotificationSettingsFormProps {
  settings: InventoryNotificationSettingsDto;
  canWrite: boolean;
  onChange: (updated: InventoryNotificationSettingsDto) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InventoryNotificationSettingsForm({ settings, canWrite, onChange }: InventoryNotificationSettingsFormProps) {
  const [email, setEmail] = useState(settings.expirationNotificationEmail ?? "");

  const { isSaving, mutationError, clearError, update } = useInventoryNotificationSettingsMutations(onChange);

  useEffect(() => {
    setEmail(settings.expirationNotificationEmail ?? "");
  }, [settings]);

  const trimmed = email.trim();
  const isValid = trimmed === "" || EMAIL_REGEX.test(trimmed);

  async function handleSave() {
    if (!isValid) return;
    await update({ expirationNotificationEmail: trimmed === "" ? null : trimmed });
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <label htmlFor="inventory-expiry-notification-email" className="block text-label-md text-on-surface mb-1">
          Correo de aviso de caducidad
        </label>
        <input
          id="inventory-expiry-notification-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!canWrite}
          placeholder="compras@agrisas.mx"
          className="w-full max-w-sm rounded border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
        />
        <p className="mt-1 text-label-sm text-on-surface-variant">
          Recibe un aviso automático cuando un lote de inventario esté por vencer (6 meses, 3 meses y el día mismo). Vacío desactiva el aviso.
        </p>
        {!isValid && (
          <p className="mt-1 text-label-sm text-error">Ingresa un correo con formato válido.</p>
        )}
      </div>

      {mutationError && (
        <div className="rounded bg-error-container/30 px-3 py-2 text-body-sm text-error flex items-center justify-between gap-2">
          {mutationError.message}
          <Button type="button" variant="text" size="sm" onClick={clearError} className="flex-shrink-0">Cerrar</Button>
        </div>
      )}

      {canWrite && (
        <Button type="button" onClick={handleSave} disabled={!isValid} loading={isSaving}>
          Guardar cambios
        </Button>
      )}
    </div>
  );
}
