import {
  EmitterFiscalSettingsStore,
  PartialEmitterFiscalData,
} from "@/modules/billing/application/ports/EmitterFiscalSettingsStore";
import {
  getEmitterFiscalSettings,
  upsertEmitterFiscalSettings,
} from "@/shared/infrastructure/emitter/emitterFiscalSettingsStore";

/** Envuelve el store singleton compartido de `shared/infrastructure/emitter/` sin moverlo ni duplicarlo. */
export class PrismaEmitterFiscalSettingsStore implements EmitterFiscalSettingsStore {
  get(): Promise<PartialEmitterFiscalData | null> {
    return getEmitterFiscalSettings();
  }

  upsert(data: PartialEmitterFiscalData): Promise<void> {
    return upsertEmitterFiscalSettings(data);
  }
}
