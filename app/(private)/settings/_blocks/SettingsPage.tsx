"use client";

import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { useTicketSettings } from "../_logic/hooks/useTicketSettings";
import { usePricingSettings } from "../_logic/hooks/usePricingSettings";
import { TicketSettingsForm } from "./TicketSettingsForm";
import { PricingSettingsForm } from "./PricingSettingsForm";
import { PageShell } from "../../../_components/organisms/PageShell";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { PageLoading } from "../../../_components/molecules/PageLoading/PageLoading";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";

export function SettingsPage() {
  const { can } = useCurrentUser();
  const canRead = can("settings:read");
  const canWrite = can("settings:write");

  const { settings, isLoading, error, refresh } = useTicketSettings();
  const { settings: pricingSettings, isLoading: isPricingLoading, error: pricingError, refresh: refreshPricing } = usePricingSettings();

  if (canRead === "loading") {
    return <PageLoading />;
  }

  if (canRead !== true) {
    return <EmptyState icon="block" title="Sin acceso" description="No tienes permiso para ver la configuración." />;
  }

  return (
    <PageShell title="Configuración" width="narrow">
      <section className="space-y-6">
        <h2 className="text-title-md font-semibold text-on-surface">Ticket de venta</h2>

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
      </section>

      <section className="space-y-6">
        <h2 className="text-title-md font-semibold text-on-surface">Precios</h2>

        {isPricingLoading && <div className="flex h-32 items-center justify-center"><Spinner size="lg" /></div>}

        {pricingError && !isPricingLoading && (
          <EmptyState icon="warning" title="Error al cargar la configuración" description={pricingError.message} />
        )}

        {pricingSettings && !isPricingLoading && (
          <PricingSettingsForm
            settings={pricingSettings}
            canWrite={canWrite === true}
            onChange={() => refreshPricing()}
          />
        )}
      </section>
    </PageShell>
  );
}
