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

// Matches Invoice.issuerFiscalRegime's VarChar(4) column (prisma/schema.prisma) — a
// pure SAT code, never the full label.
const SAT_FISCAL_REGIME_CODE_MAX_LENGTH = 4;

// SAT fiscal-regime codes are always 3 digits in the local catalog (see openspec
// admin-* specs' `taxRegime`/`fiscalRegime` regex `^\d{3}$`); this stays 3-4 to also
// accept a legacy/future 4-digit code without rejecting it outright.
const SAT_FISCAL_REGIME_CODE_PATTERN = /^(\d{3,4})(?:\s|$)/;

/**
 * TicketSettings.businessTaxRegime is free text captured for the printed ticket —
 * a leading SAT code followed by its description, but the separator is not
 * consistent across capture paths (`SatCatalogCombobox` in TicketSettingsForm.tsx
 * writes `"<code> — <description>"`; seeded/legacy data can be plain
 * `"<code> <description>"`). Extracts only the leading numeric code so it fits the
 * SAT-code column it ultimately feeds. Returns null (never a truncated/invented
 * value) when no leading code can be recovered.
 */
export function extractSatCodeFromTicketRegime(businessTaxRegime: string | null): string | null {
  if (!businessTaxRegime) return null;
  const match = businessTaxRegime.match(SAT_FISCAL_REGIME_CODE_PATTERN);
  const code = match?.[1];
  return code && code.length <= SAT_FISCAL_REGIME_CODE_MAX_LENGTH ? code : null;
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
 * All 5 fields (rfc/legalName/fiscalRegime/zipCode/address) now have the same
 * 3-tier fallback down to TicketSettings.
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
    fiscalRegime: settings?.fiscalRegime ?? extractSatCodeFromTicketRegime(ticket?.businessTaxRegime ?? null),
    zipCode: settings?.zipCode ?? ticket?.businessZipCode ?? null,
    address: settings?.address ?? ticket?.businessAddress ?? null,
  };
}
