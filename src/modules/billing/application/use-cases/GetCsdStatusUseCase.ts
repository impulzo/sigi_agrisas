import { FacturamaGateway, FacturamaCsdStatus } from "../ports/FacturamaGateway";

export class GetCsdStatusUseCase {
  constructor(private readonly gateway: FacturamaGateway) {}

  async execute(rfc?: string): Promise<FacturamaCsdStatus> {
    return this.gateway.getCsdStatus(rfc);
  }
}
