import { randomUUID } from "crypto";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  FacturamaGateway,
  FacturamaStampInput,
  FacturamaStampResult,
  FacturamaCancelResult,
  FacturamaDownloadResult,
  FacturamaCsdInput,
  FacturamaCsdStatus,
  FacturamaInvoiceSnapshot,
} from "../../application/ports/FacturamaGateway";
import { InvoiceDocumentPdf, InvoiceDocumentPdfData } from "../pdf/InvoiceDocumentPdf";
import { GetTicketSettingsUseCase } from "@/modules/settings/application/use-cases/GetTicketSettingsUseCase";
import { getEmitterFiscalSettings } from "@/shared/infrastructure/emitter/emitterFiscalSettingsStore";
import { resolveSatDescription, SatCodeSearchUseCase } from "./resolveSatDescription";

const MOCK_WATERMARK = "DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL";

const FALLBACK_INVOICE_DATA: InvoiceDocumentPdfData = {
  issuer: { name: "Agrisas", rfc: "AGR010101AB1", fiscalRegime: "601", zipCode: "83000" },
  receiver: {
    rfc: "XAXX010101000",
    name: "Cliente de prueba",
    cfdiUse: "G03",
    fiscalRegime: "601",
    taxZipCode: "00000",
  },
  lines: [
    {
      description: "Concepto de prueba",
      productCode: "MOCK-001",
      satProductCode: "01010101",
      quantity: 1,
      unitPrice: 100,
      discountPct: 0,
      ivaRate: 0.16,
      iepsRate: 0,
      lineSubtotal: 100,
      lineTotal: 116,
    },
  ],
  paymentForm: "01",
  paymentMethod: "PUE",
  subtotal: 100,
  taxTotal: 16,
  total: 116,
  currency: "MXN",
};

function toInvoiceDocumentPdfData(input: FacturamaStampInput, uuid: string): InvoiceDocumentPdfData {
  return {
    issuer: { name: "Agrisas (mock)", rfc: "AGR010101AB1", fiscalRegime: "601", zipCode: "83000" },
    receiver: {
      rfc: input.receiver.rfc,
      name: input.receiver.name,
      cfdiUse: input.receiver.cfdiUse,
      fiscalRegime: input.receiver.fiscalRegime,
      taxZipCode: input.receiver.taxZipCode,
    },
    lines: input.items.map((item) => {
      const ivaRate = item.taxes.find((t) => t.type === "IVA")?.rate ?? 0;
      const iepsRate = item.taxes.find((t) => t.type === "IEPS")?.rate ?? 0;
      const grossAmount = item.quantity * item.unitPrice;
      const discountPct = item.discount && grossAmount > 0 ? (item.discount / grossAmount) * 100 : 0;
      return {
        description: item.description,
        productCode: item.identificationNumber ?? item.productCode,
        satProductCode: item.productCode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPct,
        ivaRate,
        iepsRate,
        lineSubtotal: item.subtotal,
        lineTotal: item.total,
      };
    }),
    paymentForm: input.paymentForm,
    paymentMethod: input.paymentMethod,
    subtotal: input.items.reduce((sum, i) => sum + i.subtotal, 0),
    taxTotal: input.items.reduce((sum, i) => sum + i.taxes.reduce((s, t) => s + t.total, 0), 0),
    total: input.items.reduce((sum, i) => sum + i.total, 0),
    currency: input.currency,
    uuid,
  };
}

function toInvoiceDocumentPdfDataFromSnapshot(snapshot: FacturamaInvoiceSnapshot): InvoiceDocumentPdfData {
  return {
    issuer: {
      name: snapshot.issuer.legalName,
      rfc: snapshot.issuer.rfc,
      fiscalRegime: snapshot.issuer.fiscalRegime,
      zipCode: snapshot.issuer.zipCode,
      address: snapshot.issuer.address,
    },
    receiver: snapshot.receiver,
    lines: snapshot.items.map((item) => ({
      description: item.description,
      productCode: item.productCode,
      satProductCode: item.satProductCode,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPct: item.discountPct,
      ivaRate: item.ivaRate,
      iepsRate: item.iepsRate,
      lineSubtotal: item.lineSubtotal,
      lineTotal: item.lineTotal,
    })),
    paymentForm: snapshot.paymentForm,
    paymentMethod: snapshot.paymentMethod,
    subtotal: snapshot.subtotal,
    taxTotal: snapshot.taxTotal,
    total: snapshot.total,
    currency: snapshot.currency,
    uuid: snapshot.uuid,
  };
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildFakeXml(input: FacturamaStampInput | null, uuid: string): string {
  if (!input) {
    return (
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" NoCertificado="FAKE">` +
      `<!-- DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL --><cfdi:Complemento><tfd:TimbreFiscalDigital UUID="${uuid}"/></cfdi:Complemento>` +
      `</cfdi:Comprobante>`
    );
  }
  const conceptos = input.items
    .map(
      (item) =>
        `<cfdi:Concepto ClaveProdServ="${escapeXml(item.productCode)}" Descripcion="${escapeXml(item.description)}" ` +
        `Cantidad="${item.quantity}" ValorUnitario="${item.unitPrice}" Importe="${item.subtotal}"/>`
    )
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" NoCertificado="FAKE" ` +
    `Moneda="${escapeXml(input.currency)}" FormaPago="${escapeXml(input.paymentForm)}" MetodoPago="${escapeXml(input.paymentMethod)}">` +
    `<!-- DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL -->` +
    `<cfdi:Receptor Rfc="${escapeXml(input.receiver.rfc)}" Nombre="${escapeXml(input.receiver.name)}" ` +
    `UsoCFDI="${escapeXml(input.receiver.cfdiUse)}" RegimenFiscalReceptor="${escapeXml(input.receiver.fiscalRegime)}" ` +
    `DomicilioFiscalReceptor="${escapeXml(input.receiver.taxZipCode)}"/>` +
    `<cfdi:Conceptos>${conceptos}</cfdi:Conceptos>` +
    `<cfdi:Complemento><tfd:TimbreFiscalDigital UUID="${uuid}"/></cfdi:Complemento>` +
    `</cfdi:Comprobante>`
  );
}

export class FakeFacturamaGateway implements FacturamaGateway {
  private cancelledIds = new Set<string>();
  private stampedInputs = new Map<string, { input: FacturamaStampInput; uuid: string }>();
  private csdUploaded = false;

  constructor(
    private readonly getTicketSettingsUseCase?: GetTicketSettingsUseCase,
    private readonly searchSatTaxRegimesUseCase?: SatCodeSearchUseCase,
    private readonly searchSatCfdiUsesUseCase?: SatCodeSearchUseCase
  ) {}

  // Each call returns a fresh random UUID — unique per stamp, not identical across calls.
  async stamp(input: FacturamaStampInput): Promise<FacturamaStampResult> {
    const cfdiId = randomUUID();
    const uuid = randomUUID().toUpperCase();
    this.stampedInputs.set(cfdiId, { input, uuid });
    return {
      cfdiId,
      uuid,
      xmlUrl: undefined,
      pdfUrl: undefined,
    };
  }

  async cancel(cfdiId: string, _motive: string, _uuidReplacement?: string | null): Promise<FacturamaCancelResult> {
    this.cancelledIds.add(cfdiId);
    return { success: true };
  }

  // When `snapshot` is given (the caller already has the persisted invoice — the
  // normal case via DownloadInvoiceFileUseCase), it is the single source of
  // truth: the exact data the detail page/preview already rendered, frozen at
  // stamping time. It always wins over this gateway's own in-memory stamp
  // cache (which is process-local and lost on every dev-server restart) and
  // over a live re-read of EmitterFiscalSettings (which could have changed
  // since stamping — the issuer snapshot must not drift, per spec). The
  // in-memory cache/live-fetch path only serves calls made without a
  // snapshot (e.g. tests exercising the gateway directly).
  async download(format: "pdf" | "xml", cfdiId: string, snapshot?: FacturamaInvoiceSnapshot): Promise<FacturamaDownloadResult> {
    const stored = this.stampedInputs.get(cfdiId);
    const uuid = snapshot?.uuid ?? stored?.uuid ?? randomUUID().toUpperCase();

    if (format === "xml") {
      const xml = buildFakeXml(stored?.input ?? null, uuid);
      return { contentBase64: Buffer.from(xml).toString("base64"), contentType: "application/xml" };
    }

    const baseData = snapshot
      ? toInvoiceDocumentPdfDataFromSnapshot(snapshot)
      : stored
        ? toInvoiceDocumentPdfData(stored.input, uuid)
        : { ...FALLBACK_INVOICE_DATA, uuid };
    const emitter = snapshot ? null : await getEmitterFiscalSettings();
    const logoUrl = this.getTicketSettingsUseCase ? await this.getTicketSettingsUseCase.execute().then((s) => s.logoUrl) : null;
    const issuerFiscalRegime = emitter?.fiscalRegime ?? baseData.issuer.fiscalRegime;
    const [issuerFiscalRegimeLabel, receiverFiscalRegimeLabel, receiverCfdiUseLabel] = await Promise.all([
      this.searchSatTaxRegimesUseCase && issuerFiscalRegime
        ? resolveSatDescription(this.searchSatTaxRegimesUseCase, issuerFiscalRegime)
        : issuerFiscalRegime,
      this.searchSatTaxRegimesUseCase
        ? resolveSatDescription(this.searchSatTaxRegimesUseCase, baseData.receiver.fiscalRegime)
        : baseData.receiver.fiscalRegime,
      this.searchSatCfdiUsesUseCase
        ? resolveSatDescription(this.searchSatCfdiUsesUseCase, baseData.receiver.cfdiUse)
        : baseData.receiver.cfdiUse,
    ]);
    const data = {
      ...baseData,
      issuer: {
        ...baseData.issuer,
        logoUrl,
        rfc: emitter?.rfc ?? baseData.issuer.rfc,
        fiscalRegime: issuerFiscalRegime,
        fiscalRegimeLabel: issuerFiscalRegimeLabel,
        zipCode: emitter?.zipCode ?? baseData.issuer.zipCode,
        address: emitter?.address ?? baseData.issuer.address,
      },
      receiver: {
        ...baseData.receiver,
        fiscalRegimeLabel: receiverFiscalRegimeLabel,
        cfdiUseLabel: receiverCfdiUseLabel,
      },
    };
    const buffer = await renderToBuffer(
      createElement(InvoiceDocumentPdf, { data, watermark: MOCK_WATERMARK, folioLabel: uuid }) as never
    );
    return { contentBase64: buffer.toString("base64"), contentType: "application/pdf" };
  }

  async uploadCsd(_input: FacturamaCsdInput): Promise<FacturamaCsdStatus> {
    this.csdUploaded = true;
    return {
      rfc: _input.rfc,
      expiresAt: "2027-01-01T00:00:00",
      isValid: true,
      issuer: "FAKE CSD (mock mode)",
    };
  }

  // Mirrors real Facturama behavior: no rfc/issuer without a CSD actually uploaded to this
  // account — but resolves successfully (empty rfc), not an error. The `/billing/csd` status
  // page and the issuer cascade both need to distinguish "no CSD yet" from a real API failure;
  // only a genuine Facturama error should reject this call.
  async getCsdStatus(rfc?: string): Promise<FacturamaCsdStatus> {
    if (!this.csdUploaded) {
      return { rfc: "", isValid: false };
    }
    return {
      rfc: rfc ?? "FAKE",
      expiresAt: "2027-01-01T00:00:00",
      isValid: true,
      issuer: "FAKE CSD (mock mode)",
    };
  }
}
