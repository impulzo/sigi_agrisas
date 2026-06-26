import { InvoiceRepository, ListInvoicesOptions, ListInvoicesResult } from "../ports/InvoiceRepository";

export class ListInvoicesUseCase {
  constructor(private readonly invoiceRepo: InvoiceRepository) {}

  async execute(options: ListInvoicesOptions): Promise<ListInvoicesResult> {
    return this.invoiceRepo.list(options);
  }
}
