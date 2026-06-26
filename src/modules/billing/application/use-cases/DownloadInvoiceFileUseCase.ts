import { InvoiceRepository } from "../ports/InvoiceRepository";
import { FacturamaGateway, FacturamaDownloadResult } from "../ports/FacturamaGateway";
import { InvoiceNotFoundError } from "../../domain/errors";

export class DownloadInvoiceFileUseCase {
  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly gateway: FacturamaGateway
  ) {}

  async execute(id: string, format: "pdf" | "xml"): Promise<FacturamaDownloadResult & { filename: string }> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new InvoiceNotFoundError(id);

    if (!invoice.facturamaCfdiId) {
      return {
        contentBase64: "",
        contentType: format === "pdf" ? "application/pdf" : "application/xml",
        filename: `${invoice.uuid ?? invoice.id}.${format}`,
      };
    }

    const result = await this.gateway.download(format, invoice.facturamaCfdiId);
    return {
      ...result,
      filename: `${invoice.uuid ?? invoice.id}.${format}`,
    };
  }
}
