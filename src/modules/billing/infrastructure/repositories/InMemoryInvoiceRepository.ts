import { InvoiceRepository, ListInvoicesOptions, ListInvoicesResult, CreateInvoiceData } from "../../application/ports/InvoiceRepository";
import { Invoice, InvoiceStatus } from "../../domain/entities/Invoice";
import { InvoiceItem } from "../../domain/entities/InvoiceItem";

function makeInvoice(data: CreateInvoiceData, now: Date): Invoice {
  return Invoice.create({
    id: data.id,
    uuid: data.uuid,
    facturamaCfdiId: data.facturamaCfdiId,
    status: data.status as InvoiceStatus,
    cfdiType: data.cfdiType,
    cfdiUse: data.cfdiUse,
    paymentForm: data.paymentForm,
    paymentMethod: data.paymentMethod,
    receiverRfc: data.receiverRfc,
    receiverName: data.receiverName,
    receiverCfdiUse: data.receiverCfdiUse,
    receiverFiscalRegime: data.receiverFiscalRegime,
    receiverTaxZipCode: data.receiverTaxZipCode,
    currency: data.currency,
    subtotal: data.subtotal,
    taxTotal: data.taxTotal,
    total: data.total,
    xmlUrl: data.xmlUrl,
    pdfUrl: data.pdfUrl,
    saleId: data.saleId,
    branchId: data.branchId,
    customerId: data.customerId,
    creatorId: data.creatorId,
    cancellationMotive: null,
    uuidReplacement: null,
    cancelledAt: null,
    cancelledBy: null,
    createdAt: now,
    updatedAt: now,
    items: data.items.map((i) =>
      InvoiceItem.create({ ...i, invoiceId: data.id })
    ),
  });
}

export class InMemoryInvoiceRepository implements InvoiceRepository {
  private store = new Map<string, Invoice>();

  async list(options: ListInvoicesOptions): Promise<ListInvoicesResult> {
    let items = Array.from(this.store.values());
    if (options.branchId) items = items.filter((i) => i.branchId === options.branchId);
    if (options.status) items = items.filter((i) => i.status === options.status);
    if (options.search && options.search.length >= 2) {
      const s = options.search.toLowerCase();
      items = items.filter(
        (i) =>
          i.uuid?.toLowerCase().includes(s) ||
          i.receiverRfc.toLowerCase().includes(s) ||
          i.receiverName.toLowerCase().includes(s)
      );
    }
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, options.pageSize ?? 20);
    const total = items.length;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total };
  }

  async findById(id: string): Promise<Invoice | null> {
    return this.store.get(id) ?? null;
  }

  async findByIdWithItems(id: string): Promise<Invoice | null> {
    return this.findById(id);
  }

  async findBySale(saleId: string): Promise<Invoice[]> {
    return Array.from(this.store.values())
      .filter((i) => i.saleId === saleId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findStampedBySale(saleId: string): Promise<Invoice | null> {
    return (
      Array.from(this.store.values()).find(
        (i) => i.saleId === saleId && i.status === "stamped"
      ) ?? null
    );
  }

  async createStamped(data: CreateInvoiceData): Promise<Invoice> {
    const now = new Date();
    const invoice = makeInvoice(data, now);
    this.store.set(invoice.id, invoice);
    return invoice;
  }

  async markCancelled(
    id: string,
    motive: string,
    cancelledBy: string,
    uuidReplacement?: string | null
  ): Promise<Invoice> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Invoice not found: ${id}`);
    const updated = Invoice.create({
      ...existing,
      status: "cancelled",
      cancellationMotive: motive,
      cancelledAt: new Date(),
      cancelledBy,
      uuidReplacement: uuidReplacement ?? null,
      updatedAt: new Date(),
    });
    this.store.set(id, updated);
    return updated;
  }
}
