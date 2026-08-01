"use client";

import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { useTicketSettings } from "../_logic/hooks/useTicketSettings";
import { TicketSettingsForm } from "./TicketSettingsForm";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";

export function SettingsPage() {
  const { can } = useCurrentUser();
  const canRead = can("settings:read");
  const canWrite = can("settings:write");

  const { settings, isLoading, error, refresh } = useTicketSettings();

  if (canRead === "loading") {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (canRead !== true) {
    return <EmptyState icon="block" title="Sin acceso" description="No tienes permiso para ver la configuración." />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-headline-sm font-semibold text-on-surface">Configuración del ticket</h1>

      {isLoading && <div className="flex h-32 items-center justify-center"><Spinner size="lg" /></div>}

      {error && !isLoading && (
        <EmptyState icon="warning" title="Error al cargar la configuración" description={error.message} />
      )}

      {settings && !isLoading && (
        <TicketSettingsForm
          settings={settings}
          canWrite={canWrite === true}
          onChange={() => refresh()}
        />
      )}
    </div>
  );
}
