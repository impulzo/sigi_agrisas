import { FacturamaGateway, FacturamaCsdStatus } from "../ports/FacturamaGateway";
import { EmitterFiscalSettingsStore } from "../ports/EmitterFiscalSettingsStore";

export interface CsdStatusWithFiscalData extends FacturamaCsdStatus {
  legalName: string | null;
  fiscalRegime: string | null;
  zipCode: string | null;
  address: string | null;
}

export class GetCsdStatusUseCase {
  constructor(
    private readonly gateway: FacturamaGateway,
    private readonly store: EmitterFiscalSettingsStore
  ) {}

  async execute(rfc?: string): Promise<CsdStatusWithFiscalData> {
    const [status, fiscalSettings] = await Promise.all([
      this.gateway.getCsdStatus(rfc),
      this.store.get(),
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
