import { InvoiceRepository } from "../ports/InvoiceRepository";
import { FacturamaGateway } from "../ports/FacturamaGateway";
import { Invoice } from "../../domain/entities/Invoice";
import {
  InvoiceNotFoundError,
  InvoiceAlreadyCancelledError,
  FacturamaCancelError,
} from "../../domain/errors";

export class CancelInvoiceUseCase {
  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly gateway: FacturamaGateway
  ) {}

  async execute(
    id: string,
    motive: string,
    cancelledBy: string,
    uuidReplacement?: string | null
  ): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new InvoiceNotFoundError(id);
    if (invoice.isCancelled()) throw new InvoiceAlreadyCancelledError(id);

    if (!invoice.facturamaCfdiId) {
      throw new FacturamaCancelError("Invoice has no Facturama CFDI ID");
    }

    await this.gateway.cancel(invoice.facturamaCfdiId, motive, uuidReplacement);

    return this.invoiceRepo.markCancelled(id, motive, cancelledBy, uuidReplacement);
  }
}
