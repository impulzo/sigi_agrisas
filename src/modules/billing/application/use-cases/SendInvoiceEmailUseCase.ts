import { InvoiceRepository } from "../ports/InvoiceRepository";
import { BillingLookupService } from "../ports/BillingLookupService";
import { DownloadInvoiceFileUseCase } from "./DownloadInvoiceFileUseCase";
import { InvoiceNotFoundError, InvoiceNoEmailError, InvoiceNotStampedError, InvoiceEmailSendFailedError } from "../../domain/errors";
import type { MailerPort } from "@/shared/application/ports/MailerPort";

export class SendInvoiceEmailUseCase {
  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly lookupService: BillingLookupService,
    private readonly downloadUseCase: DownloadInvoiceFileUseCase,
    private readonly mailer: MailerPort
  ) {}

  async execute(id: string, overrideEmail?: string): Promise<{ sentTo: string }> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new InvoiceNotFoundError(id);
    if (!invoice.facturamaCfdiId) throw new InvoiceNotStampedError();

    let sentTo = overrideEmail;
    if (!sentTo) {
      const customer = invoice.customerId ? await this.lookupService.findCustomer(invoice.customerId) : null;
      sentTo = customer?.email ?? undefined;
    }
    if (!sentTo) throw new InvoiceNoEmailError();

    const [pdf, xml] = await Promise.all([
      this.downloadUseCase.execute(id, "pdf"),
      this.downloadUseCase.execute(id, "xml"),
    ]);
    const folio = invoice.uuid ?? invoice.id;

    try {
      await this.mailer.send({
        to: sentTo,
        subject: `Factura ${folio}`,
        html: `<p>Adjunto encontrarás la factura CFDI ${folio} por un total de $${invoice.total.toFixed(2)}.</p>`,
        attachments: [
          {
            filename: `factura-${folio}.pdf`,
            content: Buffer.from(pdf.contentBase64, "base64"),
            contentType: pdf.contentType,
          },
          {
            filename: `factura-${folio}.xml`,
            content: Buffer.from(xml.contentBase64, "base64"),
            contentType: xml.contentType,
          },
        ],
      });
    } catch (err) {
      throw new InvoiceEmailSendFailedError(err);
    }

    return { sentTo };
  }
}
