import { FacturamaGateway, FacturamaCsdStatus } from "../ports/FacturamaGateway";
import { getEmitterFiscalSettings } from "@/shared/infrastructure/emitter/emitterFiscalSettingsStore";

export interface CsdStatusWithFiscalData extends FacturamaCsdStatus {
  legalName: string | null;
  fiscalRegime: string | null;
  zipCode: string | null;
  address: string | null;
}

export class GetCsdStatusUseCase {
  constructor(private readonly gateway: FacturamaGateway) {}

  async execute(rfc?: string): Promise<CsdStatusWithFiscalData> {
    const [status, fiscalSettings] = await Promise.all([
      this.gateway.getCsdStatus(rfc),
      getEmitterFiscalSettings(),
    ]);
    return {
      ...status,
      legalName: fiscalSettings?.legalName ?? null,
      fiscalRegime: fiscalSettings?.fiscalRegime ?? null,
      zipCode: fiscalSettings?.zipCode ?? null,
      address: fiscalSettings?.address ?? null,
    };
  }
}
