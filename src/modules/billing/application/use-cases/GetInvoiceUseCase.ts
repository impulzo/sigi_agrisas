import { InvoiceRepository } from "../ports/InvoiceRepository";
import { Invoice } from "../../domain/entities/Invoice";
import { InvoiceNotFoundError } from "../../domain/errors";

export class GetInvoiceUseCase {
  constructor(private readonly invoiceRepo: InvoiceRepository) {}

  async execute(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findByIdWithItems(id);
    if (!invoice) throw new InvoiceNotFoundError(id);
    return invoice;
  }
}
