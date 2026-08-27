import { FacturamaGateway, FacturamaCsdInput, FacturamaCsdStatus } from "../ports/FacturamaGateway";
import { upsertEmitterFiscalSettings } from "@/shared/infrastructure/emitter/emitterFiscalSettingsStore";

export interface UploadCsdRequest extends FacturamaCsdInput {
  legalName?: string;
  fiscalRegime?: string;
  zipCode?: string;
  address?: string;
}

export class UploadCsdUseCase {
  constructor(private readonly gateway: FacturamaGateway) {}

  async execute(input: UploadCsdRequest): Promise<FacturamaCsdStatus> {
    // CSD cryptographic material (cert/key/password) is forwarded to Facturama and never persisted locally.
    const status = await this.gateway.uploadCsd(input);

    // Only the non-secret fiscal identity is persisted, and only after Facturama accepts the CSD.
    await upsertEmitterFiscalSettings({
      rfc: input.rfc,
      legalName: input.legalName,
      fiscalRegime: input.fiscalRegime,
      zipCode: input.zipCode,
      address: input.address,
    });

    return status;
  }
}
