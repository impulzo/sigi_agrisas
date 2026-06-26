import { Invoice } from "../../domain/entities/Invoice";
import { InvoiceDto } from "../dto/InvoiceDto";

export function toInvoiceDto(invoice: Invoice): InvoiceDto {
  return {
    id: invoice.id,
    uuid: invoice.uuid,
    facturamaCfdiId: invoice.facturamaCfdiId,
    status: invoice.status,
    cfdiType: invoice.cfdiType,
    cfdiUse: invoice.cfdiUse,
    paymentForm: invoice.paymentForm,
    paymentMethod: invoice.paymentMethod,
    receiverRfc: invoice.receiverRfc,
    receiverName: invoice.receiverName,
    receiverCfdiUse: invoice.receiverCfdiUse,
    receiverFiscalRegime: invoice.receiverFiscalRegime,
    receiverTaxZipCode: invoice.receiverTaxZipCode,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    taxTotal: invoice.taxTotal,
    total: invoice.total,
    xmlUrl: invoice.xmlUrl,
    pdfUrl: invoice.pdfUrl,
    saleId: invoice.saleId,
    branchId: invoice.branchId,
    customerId: invoice.customerId,
    cancellationMotive: invoice.cancellationMotive,
    cancelledAt: invoice.cancelledAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    items: invoice.items.length > 0
      ? invoice.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productCodeSnapshot: item.productCodeSnapshot,
          productNameSnapshot: item.productNameSnapshot,
          satProductCode: item.satProductCode,
          satUnitCode: item.satUnitCode,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPct: item.discountPct,
          ivaRate: item.ivaRate,
          iepsRate: item.iepsRate,
          taxObject: item.taxObject,
          lineSubtotal: item.lineSubtotal,
          lineIva: item.lineIva,
          lineIeps: item.lineIeps,
          lineTotal: item.lineTotal,
        }))
      : undefined,
  };
}
