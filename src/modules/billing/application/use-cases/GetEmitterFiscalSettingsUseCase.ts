import { resolveIssuerFiscalData, IssuerFiscalData } from "../services/resolveIssuerFiscalData";
import { FacturamaGateway } from "../ports/FacturamaGateway";

export type EmitterFiscalSettingsDto = IssuerFiscalData;

export class GetEmitterFiscalSettingsUseCase {
  constructor(private readonly gateway: FacturamaGateway) {}

  async execute(): Promise<EmitterFiscalSettingsDto> {
    return resolveIssuerFiscalData(this.gateway);
  }
}
