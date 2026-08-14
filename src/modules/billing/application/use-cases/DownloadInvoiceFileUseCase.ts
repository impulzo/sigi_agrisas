import { InvoiceRepository } from "../ports/InvoiceRepository";
import { FacturamaGateway, FacturamaDownloadResult } from "../ports/FacturamaGateway";
import { InvoiceNotFoundError, InvoiceNotStampedError, InvoiceFileDownloadFailedError } from "../../domain/errors";

export class DownloadInvoiceFileUseCase {
  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly gateway: FacturamaGateway
  ) {}

  async execute(id: string, format: "pdf" | "xml"): Promise<FacturamaDownloadResult & { filename: string }> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new InvoiceNotFoundError(id);
    if (!invoice.facturamaCfdiId) throw new InvoiceNotStampedError();

    let result: FacturamaDownloadResult;
    try {
      result = await this.gateway.download(format, invoice.facturamaCfdiId);
    } catch (err) {
      throw new InvoiceFileDownloadFailedError(err);
    }

    return {
      ...result,
      filename: `${invoice.uuid ?? invoice.id}.${format}`,
    };
  }
}
