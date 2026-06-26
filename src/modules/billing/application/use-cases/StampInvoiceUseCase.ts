import { randomUUID } from "crypto";
import { InvoiceRepository } from "../ports/InvoiceRepository";
import { FacturamaGateway, FacturамаStampInput, FacturamaItemTaxInput } from "../ports/FacturamaGateway";
import { BillingLookupService, CustomerForBilling, BranchForBilling } from "../ports/BillingLookupService";
import { InvoiceTotalsCalculator } from "../../domain/services/InvoiceTotalsCalculator";
import {
  SaleNotInvoiceableError,
  SaleAlreadyInvoicedError,
  ReceiverFiscalDataIncompleteError,
} from "../../domain/errors";
import { Invoice } from "../../domain/entities/Invoice";
import {
  StampInvoiceFromSaleRequest,
  StampStandaloneInvoiceRequest,
  StandaloneInvoiceItemInput,
} from "../dto/InvoiceDto";

type StampInput =
  | ({ type: "sale" } & StampInvoiceFromSaleRequest)
  | ({ type: "standalone" } & StampStandaloneInvoiceRequest);

const DEFAULT_SAT_UNIT_CODE = "H87";
const DEFAULT_SAT_PRODUCT_CODE = "01010101";
const DEFAULT_UNIT = "PZA";

function validateReceiver(
  rfc: string | null | undefined,
  cfdiUse: string | null | undefined,
  fiscalRegime: string | null | undefined,
  taxZipCode: string | null | undefined,
  name: string | null | undefined
): void {
  const missing: string[] = [];
  if (!rfc) missing.push("rfc");
  if (!cfdiUse) missing.push("cfdiUse");
  if (!fiscalRegime) missing.push("fiscalRegime");
  if (!taxZipCode) missing.push("taxZipCode");
  if (!name) missing.push("name");
  if (missing.length > 0) throw new ReceiverFiscalDataIncompleteError(missing);
}

export class StampInvoiceUseCase {
  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly gateway: FacturamaGateway,
    private readonly lookupService: BillingLookupService
  ) {}

  async execute(input: StampInput, creatorId: string, resolvedBranchId: string): Promise<Invoice> {
    if (input.type === "sale") {
      return this.stampFromSale(input, creatorId, resolvedBranchId);
    }
    return this.stampStandalone(input, creatorId, resolvedBranchId);
  }

  private async stampFromSale(
    input: StampInvoiceFromSaleRequest & { type: "sale" },
    creatorId: string,
    resolvedBranchId: string
  ): Promise<Invoice> {
    const sale = await this.lookupService.findSaleWithItems(input.saleId);
    if (!sale) throw new SaleNotInvoiceableError(input.saleId, "not_found");
    if (sale.status !== "completed") throw new SaleNotInvoiceableError(input.saleId, sale.status);

    const existing = await this.invoiceRepo.findStampedBySale(input.saleId);
    if (existing) throw new SaleAlreadyInvoicedError(input.saleId, existing.id);

    const customer = sale.customerId
      ? await this.lookupService.findCustomer(sale.customerId)
      : null;
    const branch = await this.lookupService.findBranch(sale.branchId);

    validateReceiver(
      customer?.rfc,
      input.cfdiUse ?? customer?.cfdiUse,
      customer?.taxRegime,
      customer?.taxZipCode,
      customer?.legalName ?? customer?.name
    );

    const receiverName = customer!.legalName ?? customer!.name;
    const cfdiUse = input.cfdiUse ?? customer!.cfdiUse!;
    const paymentForm = input.paymentForm ?? "01";
    const paymentMethod = input.paymentMethod ?? "PUE";
    const expeditionPlace = branch?.address?.slice(-5) ?? "00000";

    const facturamaItems = sale.items.map((item) => {
      const ivaRate = item.ivaRate ?? 0;
      const iepsRate = item.iepsRate ?? 0;
      const discountPct = item.discountPct ?? 0;
      const lineSubtotal = item.lineSubtotal;
      const taxes: FacturamaItemTaxInput[] = [];
      if (ivaRate > 0) {
        taxes.push({ type: "IVA", rate: ivaRate, base: lineSubtotal, total: +(lineSubtotal * ivaRate).toFixed(4), isRetention: false });
      }
      if (iepsRate > 0) {
        taxes.push({ type: "IEPS", rate: iepsRate, base: lineSubtotal, total: +(lineSubtotal * iepsRate).toFixed(4), isRetention: false });
      }
      const taxObject = taxes.length > 0 ? "02" : "01";
      const discount = discountPct > 0 ? +(item.quantity * item.unitPrice * (discountPct / 100)).toFixed(4) : undefined;

      return {
        productCode: item.satProductCode ?? DEFAULT_SAT_PRODUCT_CODE,
        identificationNumber: item.productCodeSnapshot,
        description: item.productNameSnapshot,
        unit: DEFAULT_UNIT,
        satUnitCode: DEFAULT_SAT_UNIT_CODE,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount,
        subtotal: lineSubtotal,
        taxes,
        taxObject,
        total: item.lineTotal,
      };
    });

    const stampPayload: FacturамаStampInput = {
      currency: "MXN",
      paymentForm,
      paymentMethod,
      expeditionPlace,
      cfdiType: "I",
      receiver: {
        rfc: customer!.rfc,
        name: receiverName,
        cfdiUse,
        fiscalRegime: customer!.taxRegime!,
        taxZipCode: customer!.taxZipCode!,
      },
      items: facturamaItems,
    };

    const result = await this.gateway.stamp(stampPayload);

    const itemsData = sale.items.map((item, idx) => {
      const ivaRate = item.ivaRate ?? 0;
      const iepsRate = item.iepsRate ?? 0;
      const lineSubtotal = item.lineSubtotal;
      const lineIva = +(lineSubtotal * ivaRate).toFixed(4);
      const lineIeps = +(lineSubtotal * iepsRate).toFixed(4);
      const taxObject = ivaRate > 0 || iepsRate > 0 ? "02" : "01";
      return {
        id: randomUUID(),
        productId: item.productId,
        productCodeSnapshot: item.productCodeSnapshot,
        productNameSnapshot: item.productNameSnapshot,
        satProductCode: item.satProductCode ?? null,
        satUnitCode: DEFAULT_SAT_UNIT_CODE,
        unit: DEFAULT_UNIT,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPct: item.discountPct,
        ivaRate,
        iepsRate,
        taxObject,
        lineSubtotal,
        lineIva,
        lineIeps,
        lineTotal: item.lineTotal,
      };
    });

    return this.invoiceRepo.createStamped({
      id: randomUUID(),
      uuid: result.uuid,
      facturamaCfdiId: result.cfdiId,
      status: "stamped",
      cfdiType: "I",
      cfdiUse,
      paymentForm,
      paymentMethod,
      receiverRfc: customer!.rfc,
      receiverName,
      receiverCfdiUse: cfdiUse,
      receiverFiscalRegime: customer!.taxRegime!,
      receiverTaxZipCode: customer!.taxZipCode!,
      currency: "MXN",
      subtotal: sale.subtotal,
      taxTotal: sale.taxTotal,
      total: sale.total,
      xmlUrl: result.xmlUrl ?? null,
      pdfUrl: result.pdfUrl ?? null,
      saleId: input.saleId,
      branchId: sale.branchId,
      customerId: sale.customerId,
      creatorId,
      items: itemsData,
    });
  }

  private async stampStandalone(
    input: StampStandaloneInvoiceRequest & { type: "standalone" },
    creatorId: string,
    resolvedBranchId: string
  ): Promise<Invoice> {
    validateReceiver(
      input.customer.rfc,
      input.customer.cfdiUse,
      input.customer.fiscalRegime,
      input.customer.taxZipCode,
      input.customer.name
    );

    const paymentForm = input.paymentForm ?? "01";
    const paymentMethod = input.paymentMethod ?? "PUE";
    const branch = await this.lookupService.findBranch(resolvedBranchId);
    const expeditionPlace = branch?.address?.slice(-5) ?? "00000";

    const totalsResult = InvoiceTotalsCalculator.computeTotals(
      input.items.map((i) => ({
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountPct: i.discountPct,
        ivaRate: i.ivaRate,
        iepsRate: i.iepsRate,
      }))
    );

    const facturamaItems = input.items.map((item, idx) => {
      const lt = totalsResult.lines[idx];
      const ivaRate = item.ivaRate ?? 0;
      const iepsRate = item.iepsRate ?? 0;
      const taxes: FacturamaItemTaxInput[] = [];
      if (ivaRate > 0) taxes.push({ type: "IVA", rate: ivaRate, base: lt.lineSubtotal, total: lt.lineIva, isRetention: false });
      if (iepsRate > 0) taxes.push({ type: "IEPS", rate: iepsRate, base: lt.lineSubtotal, total: lt.lineIeps, isRetention: false });
      const discount = (item.discountPct ?? 0) > 0
        ? +(item.quantity * item.unitPrice * ((item.discountPct ?? 0) / 100)).toFixed(4)
        : undefined;
      return {
        productCode: item.satProductCode ?? DEFAULT_SAT_PRODUCT_CODE,
        identificationNumber: item.productCode,
        description: item.description,
        unit: item.unit ?? DEFAULT_UNIT,
        satUnitCode: item.satUnitCode ?? DEFAULT_SAT_UNIT_CODE,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount,
        subtotal: lt.lineSubtotal,
        taxes,
        taxObject: lt.taxObject,
        total: lt.lineTotal,
      };
    });

    const stampPayload: FacturамаStampInput = {
      currency: "MXN",
      paymentForm,
      paymentMethod,
      expeditionPlace,
      cfdiType: "I",
      receiver: {
        rfc: input.customer.rfc,
        name: input.customer.name,
        cfdiUse: input.customer.cfdiUse,
        fiscalRegime: input.customer.fiscalRegime,
        taxZipCode: input.customer.taxZipCode,
      },
      items: facturamaItems,
    };

    const result = await this.gateway.stamp(stampPayload);

    const itemsData = input.items.map((item, idx) => {
      const lt = totalsResult.lines[idx];
      return {
        id: randomUUID(),
        productId: item.productId ?? null,
        productCodeSnapshot: item.productCode,
        productNameSnapshot: item.description,
        satProductCode: item.satProductCode ?? null,
        satUnitCode: item.satUnitCode ?? DEFAULT_SAT_UNIT_CODE,
        unit: item.unit ?? DEFAULT_UNIT,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPct: item.discountPct ?? null,
        ivaRate: item.ivaRate ?? 0,
        iepsRate: item.iepsRate ?? 0,
        taxObject: lt.taxObject,
        lineSubtotal: lt.lineSubtotal,
        lineIva: lt.lineIva,
        lineIeps: lt.lineIeps,
        lineTotal: lt.lineTotal,
      };
    });

    return this.invoiceRepo.createStamped({
      id: randomUUID(),
      uuid: result.uuid,
      facturamaCfdiId: result.cfdiId,
      status: "stamped",
      cfdiType: "I",
      cfdiUse: input.customer.cfdiUse,
      paymentForm,
      paymentMethod,
      receiverRfc: input.customer.rfc,
      receiverName: input.customer.name,
      receiverCfdiUse: input.customer.cfdiUse,
      receiverFiscalRegime: input.customer.fiscalRegime,
      receiverTaxZipCode: input.customer.taxZipCode,
      currency: "MXN",
      subtotal: totalsResult.subtotal,
      taxTotal: totalsResult.taxTotal,
      total: totalsResult.total,
      xmlUrl: result.xmlUrl ?? null,
      pdfUrl: result.pdfUrl ?? null,
      saleId: null,
      branchId: resolvedBranchId,
      customerId: null,
      creatorId,
      items: itemsData,
    });
  }
}
