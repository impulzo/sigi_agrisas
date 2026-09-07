import { InvoiceRepository } from "../ports/InvoiceRepository";
import { FacturamaGateway, FacturamaDownloadResult, FacturamaInvoiceSnapshot } from "../ports/FacturamaGateway";
import { BillingLookupService } from "../ports/BillingLookupService";
import { GetEmitterFiscalSettingsUseCase } from "./GetEmitterFiscalSettingsUseCase";
import { GetTicketSettingsUseCase } from "@/modules/settings/application/use-cases/GetTicketSettingsUseCase";
import { resolveIssuerFiscalData } from "../services/resolveIssuerFiscalData";
import { EmitterFiscalSettingsStore } from "../ports/EmitterFiscalSettingsStore";
import { resolveSatDescription, type SatCodeSearchUseCase } from "../services/resolveSatDescription";
import { InvoiceNotFoundError, InvoiceNotStampedError, InvoiceFileDownloadFailedError } from "../../domain/errors";
import type { Invoice } from "../../domain/entities/Invoice";

function toSnapshot(
  invoice: Invoice,
  branchName: string | null,
  resolvedIssuer: { rfc: string | null; legalName: string | null; fiscalRegime: string | null; zipCode: string | null; address: string | null; email: string | null },
  labels: { issuerFiscalRegimeLabel: string | null; receiverFiscalRegimeLabel: string | null; receiverCfdiUseLabel: string | null },
  satProductCodeLabelByCode: Map<string, string>,
): FacturamaInvoiceSnapshot {
  return {
    uuid: invoice.uuid ?? invoice.id,
    issuer: {
      rfc: resolvedIssuer.rfc ?? invoice.issuerRfc,
      legalName: resolvedIssuer.legalName ?? invoice.issuerLegalName,
      fiscalRegime: resolvedIssuer.fiscalRegime ?? invoice.issuerFiscalRegime,
      fiscalRegimeLabel: labels.issuerFiscalRegimeLabel,
      zipCode: resolvedIssuer.zipCode ?? invoice.issuerZipCode,
      address: resolvedIssuer.address ?? invoice.issuerAddress,
      email: resolvedIssuer.email ?? invoice.issuerEmail,
      branchName,
    },
    receiver: {
      rfc: invoice.receiverRfc,
      name: invoice.receiverName,
      cfdiUse: invoice.receiverCfdiUse,
      fiscalRegime: invoice.receiverFiscalRegime,
      taxZipCode: invoice.receiverTaxZipCode,
      fiscalRegimeLabel: labels.receiverFiscalRegimeLabel,
      cfdiUseLabel: labels.receiverCfdiUseLabel,
    },
    items: invoice.items.map((item) => ({
      description: item.productNameSnapshot,
      productCode: item.productCodeSnapshot,
      satProductCode: item.satProductCode,
      satProductCodeLabel: item.satProductCode ? satProductCodeLabelByCode.get(item.satProductCode) ?? null : null,
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
    emittedAt: invoice.createdAt.toISOString(),
  };
}

export class DownloadInvoiceFileUseCase {
  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly gateway: FacturamaGateway,
    private readonly lookupService?: BillingLookupService,
    private readonly getEmitterFiscalSettingsUseCase?: GetEmitterFiscalSettingsUseCase,
    private readonly getTicketSettingsUseCase?: GetTicketSettingsUseCase,
    private readonly searchSatTaxRegimesUseCase?: SatCodeSearchUseCase,
    private readonly searchSatCfdiUsesUseCase?: SatCodeSearchUseCase,
    private readonly searchSatCodesUseCase?: SatCodeSearchUseCase,
    private readonly store?: EmitterFiscalSettingsStore
  ) {}

  async execute(id: string, format: "pdf" | "xml"): Promise<FacturamaDownloadResult & { filename: string }> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new InvoiceNotFoundError(id);
    if (!invoice.facturamaCfdiId) throw new InvoiceNotStampedError();

    const branch = this.lookupService ? await this.lookupService.findBranch(invoice.branchId) : null;

    const resolvedIssuer = await resolveIssuerFiscalData(this.gateway, this.getTicketSettingsUseCase, this.store);

    const [issuerFiscalRegimeLabel, receiverFiscalRegimeLabel, receiverCfdiUseLabel] = await Promise.all([
      resolvedIssuer.fiscalRegime && this.searchSatTaxRegimesUseCase
        ? resolveSatDescription(this.searchSatTaxRegimesUseCase, resolvedIssuer.fiscalRegime)
        : null,
      this.searchSatTaxRegimesUseCase
        ? resolveSatDescription(this.searchSatTaxRegimesUseCase, invoice.receiverFiscalRegime)
        : null,
      this.searchSatCfdiUsesUseCase
        ? resolveSatDescription(this.searchSatCfdiUsesUseCase, invoice.receiverCfdiUse)
        : null,
    ]);

    const uniqueSatProductCodes = [...new Set(invoice.items.map((i) => i.satProductCode).filter((c): c is string => !!c))];
    const satProductCodeLabelByCode = new Map<string, string>();
    if (this.searchSatCodesUseCase && uniqueSatProductCodes.length > 0) {
      const labels = await Promise.all(
        uniqueSatProductCodes.map((code) => resolveSatDescription(this.searchSatCodesUseCase!, code))
      );
      uniqueSatProductCodes.forEach((code, idx) => satProductCodeLabelByCode.set(code, labels[idx]));
    }

    let result: FacturamaDownloadResult;
    try {
      result = await this.gateway.download(
        format,
        invoice.facturamaCfdiId,
        toSnapshot(invoice, branch?.name ?? null, resolvedIssuer, { issuerFiscalRegimeLabel, receiverFiscalRegimeLabel, receiverCfdiUseLabel }, satProductCodeLabelByCode),
      );
    } catch (err) {
      throw new InvoiceFileDownloadFailedError(err);
    }

    return {
      ...result,
      filename: `${invoice.uuid ?? invoice.id}.${format}`,
    };
  }
}
