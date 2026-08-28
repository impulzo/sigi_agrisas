import { getEmitterFiscalSettings } from "@/shared/infrastructure/emitter/emitterFiscalSettingsStore";
import { FacturamaGateway } from "../ports/FacturamaGateway";
import { GetTicketSettingsUseCase } from "@/modules/settings/application/use-cases/GetTicketSettingsUseCase";

export interface IssuerFiscalData {
  rfc: string | null;
  legalName: string | null;
  fiscalRegime: string | null;
  zipCode: string | null;
  address: string | null;
}

/**
 * Resolves the issuer's fiscal identity from the two real sources the admin
 * actually captures data in — never a synthetic/hardcoded placeholder. Per
 * field: live CSD status (Facturama, rfc/legalName only) → EmitterFiscalSettings
 * (the CSD manager's own local capture, `/billing/csd` — the real Facturama
 * CSD-status API doesn't expose fiscalRegime/zipCode/address at all, so this
 * local capture is where those live) → TicketSettings (business data already
 * captured for ticket printing, `Configuración > Ticket de venta`). Whatever
 * neither source has stays `null` — callers/UI already render that as "—".
 * TicketSettings has no zip-code field, so zipCode only has the first two tiers.
 */
export async function resolveIssuerFiscalData(
  gateway: FacturamaGateway,
  getTicketSettingsUseCase?: GetTicketSettingsUseCase
): Promise<IssuerFiscalData> {
  let csdRfc: string | undefined;
  let csdLegalName: string | undefined;
  try {
    const status = await gateway.getCsdStatus();
    csdRfc = status.rfc || undefined;
    csdLegalName = status.issuer || undefined;
  } catch {
    // No CSD loaded, network error, or Facturama rejection — fall through to the next tier.
  }

  const [settings, ticket] = await Promise.all([
    getEmitterFiscalSettings(),
    getTicketSettingsUseCase ? getTicketSettingsUseCase.execute() : null,
  ]);

  return {
    rfc: csdRfc ?? settings?.rfc ?? ticket?.businessRfc ?? null,
    legalName: csdLegalName ?? settings?.legalName ?? ticket?.businessName ?? null,
    fiscalRegime: settings?.fiscalRegime ?? ticket?.businessTaxRegime ?? null,
    zipCode: settings?.zipCode ?? null,
    address: settings?.address ?? ticket?.businessAddress ?? null,
  };
}
