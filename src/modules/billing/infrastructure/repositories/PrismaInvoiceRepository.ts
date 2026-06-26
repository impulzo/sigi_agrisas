import { PrismaClient, Prisma } from "@prisma/client";
import { InvoiceRepository, ListInvoicesOptions, ListInvoicesResult, CreateInvoiceData } from "../../application/ports/InvoiceRepository";
import { Invoice, InvoiceStatus } from "../../domain/entities/Invoice";
import { InvoiceItem } from "../../domain/entities/InvoiceItem";

type InvoiceRow = Prisma.InvoiceGetPayload<{ include: { items: true } }>;

function toNumber(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : parseFloat(v.toString());
}

function mapItem(row: InvoiceRow["items"][number]): InvoiceItem {
  return InvoiceItem.create({
    id: row.id,
    invoiceId: row.invoiceId,
    productId: row.productId,
    productCodeSnapshot: row.productCodeSnapshot,
    productNameSnapshot: row.productNameSnapshot,
    satProductCode: row.satProductCode,
    satUnitCode: row.satUnitCode,
    unit: row.unit,
    quantity: toNumber(row.quantity),
    unitPrice: toNumber(row.unitPrice),
    discountPct: row.discountPct != null ? toNumber(row.discountPct) : null,
    ivaRate: toNumber(row.ivaRate),
    iepsRate: toNumber(row.iepsRate),
    taxObject: row.taxObject,
    lineSubtotal: toNumber(row.lineSubtotal),
    lineIva: toNumber(row.lineIva),
    lineIeps: toNumber(row.lineIeps),
    lineTotal: toNumber(row.lineTotal),
  });
}

function mapInvoice(row: InvoiceRow): Invoice {
  return Invoice.create({
    id: row.id,
    uuid: row.uuid,
    facturamaCfdiId: row.facturamaCfdiId,
    status: row.status as InvoiceStatus,
    cfdiType: row.cfdiType,
    cfdiUse: row.cfdiUse,
    paymentForm: row.paymentForm,
    paymentMethod: row.paymentMethod,
    receiverRfc: row.receiverRfc,
    receiverName: row.receiverName,
    receiverCfdiUse: row.receiverCfdiUse,
    receiverFiscalRegime: row.receiverFiscalRegime,
    receiverTaxZipCode: row.receiverTaxZipCode,
    currency: row.currency,
    subtotal: toNumber(row.subtotal),
    taxTotal: toNumber(row.taxTotal),
    total: toNumber(row.total),
    xmlUrl: row.xmlUrl,
    pdfUrl: row.pdfUrl,
    saleId: row.saleId,
    branchId: row.branchId,
    customerId: row.customerId,
    creatorId: row.creatorId,
    cancellationMotive: row.cancellationMotive,
    uuidReplacement: row.uuidReplacement,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    items: row.items.map(mapItem),
  });
}

export class PrismaInvoiceRepository implements InvoiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(options: ListInvoicesOptions): Promise<ListInvoicesResult> {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.InvoiceWhereInput = {};
    if (options.branchId) where.branchId = options.branchId;
    if (options.status) where.status = options.status;
    if (options.search && options.search.length >= 2) {
      where.OR = [
        { uuid: { contains: options.search, mode: "insensitive" } },
        { receiverRfc: { contains: options.search, mode: "insensitive" } },
        { receiverName: { contains: options.search, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        include: { items: true },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { items: rows.map(mapInvoice), total };
  }

  async findById(id: string): Promise<Invoice | null> {
    const row = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });
    return row ? mapInvoice(row) : null;
  }

  async findByIdWithItems(id: string): Promise<Invoice | null> {
    return this.findById(id);
  }

  async findBySale(saleId: string): Promise<Invoice[]> {
    const rows = await this.prisma.invoice.findMany({
      where: { saleId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapInvoice);
  }

  async findStampedBySale(saleId: string): Promise<Invoice | null> {
    const row = await this.prisma.invoice.findFirst({
      where: { saleId, status: "stamped" },
      include: { items: true },
    });
    return row ? mapInvoice(row) : null;
  }

  async createStamped(data: CreateInvoiceData): Promise<Invoice> {
    const row = await this.prisma.invoice.create({
      data: {
        id: data.id,
        uuid: data.uuid,
        facturamaCfdiId: data.facturamaCfdiId,
        status: data.status,
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
        items: {
          create: data.items.map((item) => ({
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
          })),
        },
      },
      include: { items: true },
    });
    return mapInvoice(row);
  }

  async markCancelled(
    id: string,
    motive: string,
    cancelledBy: string,
    uuidReplacement?: string | null
  ): Promise<Invoice> {
    const row = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: "cancelled",
        cancellationMotive: motive,
        cancelledAt: new Date(),
        cancelledBy,
        uuidReplacement: uuidReplacement ?? null,
      },
      include: { items: true },
    });
    return mapInvoice(row);
  }
}
