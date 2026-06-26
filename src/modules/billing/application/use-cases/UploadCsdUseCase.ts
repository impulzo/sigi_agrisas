import { FacturamaGateway, FacturamaCsdInput, FacturamaCsdStatus } from "../ports/FacturamaGateway";

export class UploadCsdUseCase {
  constructor(private readonly gateway: FacturamaGateway) {}

  async execute(input: FacturamaCsdInput): Promise<FacturamaCsdStatus> {
    // Secrets are forwarded to Facturama and never persisted locally.
    return this.gateway.uploadCsd(input);
  }
}
