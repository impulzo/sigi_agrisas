import { resolveIssuerFiscalData, IssuerFiscalData } from "../services/resolveIssuerFiscalData";
import { FacturamaGateway } from "../ports/FacturamaGateway";
import { GetTicketSettingsUseCase } from "@/modules/settings/application/use-cases/GetTicketSettingsUseCase";

export type EmitterFiscalSettingsDto = IssuerFiscalData;

export class GetEmitterFiscalSettingsUseCase {
  constructor(
    private readonly gateway: FacturamaGateway,
    private readonly getTicketSettingsUseCase?: GetTicketSettingsUseCase
  ) {}

  async execute(): Promise<EmitterFiscalSettingsDto> {
    return resolveIssuerFiscalData(this.gateway, this.getTicketSettingsUseCase);
  }
}
