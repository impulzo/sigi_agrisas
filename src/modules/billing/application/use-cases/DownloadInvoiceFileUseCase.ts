import { InvoiceRepository } from "../ports/InvoiceRepository";
import { FacturamaGateway, FacturamaDownloadResult, FacturamaInvoiceSnapshot } from "../ports/FacturamaGateway";
import { InvoiceNotFoundError, InvoiceNotStampedError, InvoiceFileDownloadFailedError } from "../../domain/errors";
import type { Invoice } from "../../domain/entities/Invoice";

function toSnapshot(invoice: Invoice): FacturamaInvoiceSnapshot {
  return {
    uuid: invoice.uuid ?? invoice.id,
    issuer: {
      rfc: invoice.issuerRfc,
      legalName: invoice.issuerLegalName,
      fiscalRegime: invoice.issuerFiscalRegime,
      zipCode: invoice.issuerZipCode,
      address: invoice.issuerAddress,
    },
    receiver: {
      rfc: invoice.receiverRfc,
      name: invoice.receiverName,
      cfdiUse: invoice.receiverCfdiUse,
      fiscalRegime: invoice.receiverFiscalRegime,
      taxZipCode: invoice.receiverTaxZipCode,
    },
    items: invoice.items.map((item) => ({
      description: item.productNameSnapshot,
      productCode: item.productCodeSnapshot,
      satProductCode: item.satProductCode,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPct: item.discountPct ?? 0,
      ivaRate: item.ivaRate,
      iepsRate: item.iepsRate,
      lineSubtotal: item.lineSubtotal,
      lineTotal: item.lineTotal,
    })),
    paymentForm: invoice.paymentForm,
    paymentMethod: invoice.paymentMethod,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    taxTotal: invoice.taxTotal,
    total: invoice.total,
  };
}

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
      result = await this.gateway.download(format, invoice.facturamaCfdiId, toSnapshot(invoice));
    } catch (err) {
      throw new InvoiceFileDownloadFailedError(err);
    }

    return {
      ...result,
      filename: `${invoice.uuid ?? invoice.id}.${format}`,
    };
  }
}
