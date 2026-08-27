import { getEmitterFiscalSettings } from "@/shared/infrastructure/emitter/emitterFiscalSettingsStore";
import { FacturamaGateway } from "../ports/FacturamaGateway";

export interface IssuerFiscalData {
  rfc: string;
  legalName: string;
  fiscalRegime: string;
  zipCode: string;
  address: string;
}

export const TEST_FALLBACK_ISSUER: IssuerFiscalData = {
  rfc: "AGR010101AB1",
  legalName: "Agrisas",
  fiscalRegime: "601",
  zipCode: "83000",
  address: "Dirección de prueba, Culiacán, Sinaloa, México",
};

/**
 * Resolves the issuer's fiscal identity via a 3-tier cascade: live CSD status
 * (Facturama, rfc/legalName only) → EmitterFiscalSettings (local, all fields) →
 * fixed test data. Every field is guaranteed non-empty — never null/undefined.
 */
export async function resolveIssuerFiscalData(gateway: FacturamaGateway): Promise<IssuerFiscalData> {
  let csdRfc: string | undefined;
  let csdLegalName: string | undefined;
  try {
    const status = await gateway.getCsdStatus();
    csdRfc = status.rfc || undefined;
    csdLegalName = status.issuer || undefined;
  } catch {
    // No CSD loaded, network error, or Facturama rejection — fall through to the next tier.
  }

  const settings = await getEmitterFiscalSettings();

  return {
    rfc: csdRfc ?? settings?.rfc ?? TEST_FALLBACK_ISSUER.rfc,
    legalName: csdLegalName ?? settings?.legalName ?? TEST_FALLBACK_ISSUER.legalName,
    fiscalRegime: settings?.fiscalRegime ?? TEST_FALLBACK_ISSUER.fiscalRegime,
    zipCode: settings?.zipCode ?? TEST_FALLBACK_ISSUER.zipCode,
    address: settings?.address ?? TEST_FALLBACK_ISSUER.address,
  };
}
