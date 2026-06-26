import { InvoiceRepository } from "../ports/InvoiceRepository";
import { Invoice } from "../../domain/entities/Invoice";

export class ListInvoicesBySaleUseCase {
  constructor(private readonly invoiceRepo: InvoiceRepository) {}

  async execute(saleId: string): Promise<Invoice[]> {
    return this.invoiceRepo.findBySale(saleId);
  }
}
