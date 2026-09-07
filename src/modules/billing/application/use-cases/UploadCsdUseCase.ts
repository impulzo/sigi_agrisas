import { FacturamaGateway, FacturamaCsdInput, FacturamaCsdStatus } from "../ports/FacturamaGateway";
import { EmitterFiscalSettingsStore } from "../ports/EmitterFiscalSettingsStore";

export interface UploadCsdRequest extends FacturamaCsdInput {
  legalName?: string;
  fiscalRegime?: string;
  zipCode?: string;
  address?: string;
}

export class UploadCsdUseCase {
  constructor(
    private readonly gateway: FacturamaGateway,
    private readonly store: EmitterFiscalSettingsStore
  ) {}

  async execute(input: UploadCsdRequest): Promise<FacturamaCsdStatus> {
    // CSD cryptographic material (cert/key/password) is forwarded to Facturama and never persisted locally.
    const status = await this.gateway.uploadCsd(input);

    // Only the non-secret fiscal identity is persisted, and only after Facturama accepts the CSD.
    await this.store.upsert({
      rfc: input.rfc,
      legalName: input.legalName,
      fiscalRegime: input.fiscalRegime,
      zipCode: input.zipCode,
      address: input.address,
    });

    return status;
  }
}
