"use client";

import type { ParsedSatInvoice, SatConcepto } from "./satXmlParser";
import type { PaymentMethodOption } from "../../../../_hooks/usePaymentMethodsOptions";
import type { NewProviderInput, ProductDto } from "../types/api";
import { searchProductsBySatCode } from "../services/searchProductsBySatCode";

const FORMA_PAGO_KEYWORDS: Record<string, string[]> = {
  "01": ["efectivo"],
  "02": ["cheque"],
  "03": ["transferencia", "transfer"],
  "04": ["tarjeta"],
  "28": ["tarjeta", "debito", "débito"],
  "99": [],
};

export function mapFormaPagoToPaymentMethod(
  formaPago: string | null,
  paymentMethods: PaymentMethodOption[]
): string | null {
  if (!formaPago) return null;
  const keywords = FORMA_PAGO_KEYWORDS[formaPago];
  if (!keywords || keywords.length === 0) return null;
  const lower = (s: string) => s.toLowerCase();
  const found = paymentMethods.find(
    (pm) => keywords.some((k) => lower(pm.name).includes(k) || lower(pm.code).includes(k))
  );
  return found?.id ?? null;
}

export interface SatMatchLine {
  product: ProductDto;
  quantity: number;
  unitCost: number;
}

export interface SatApplyResult {
  newProvider: NewProviderInput | null;
  paymentMethodId: string | null;
  lines: SatMatchLine[];
  unmatched: SatConcepto[];
  warnings: string[];
  metadata: {
    satUuid: string | null;
    supplierInvoiceNumber: string | null;
    invoiceDate: string;
    purchasedAt: string;
    xmlFileName: string;
  };
}

function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

export async function buildSatApplyResult(
  parsed: ParsedSatInvoice,
  paymentMethods: PaymentMethodOption[],
  xmlFileName: string
): Promise<SatApplyResult> {
  const warnings: string[] = [];
  if (parsed.moneda && parsed.moneda.toUpperCase() !== "MXN") {
    warnings.push(`La factura está en ${parsed.moneda}; el sistema registra en MXN.`);
  }

  const claves = Array.from(new Set(parsed.conceptos.map((c) => c.claveProdServ).filter(Boolean)));
  const productsByClave = new Map<string, ProductDto>();
  for (const clave of claves) {
    try {
      const items = await searchProductsBySatCode(clave);
      if (items.length > 0) productsByClave.set(clave, items[0]);
    } catch {
      // best effort: sin permiso o error de red, simplemente no se auto-mapea
    }
  }

  const grouped = new Map<string, { product: ProductDto; quantity: number; unitCost: number; conceptos: SatConcepto[] }>();
  const unmatched: SatConcepto[] = [];

  for (const concepto of parsed.conceptos) {
    const product = productsByClave.get(concepto.claveProdServ);
    if (!product) {
      unmatched.push(concepto);
      continue;
    }
    const existing = grouped.get(product.id);
    if (existing) {
      existing.quantity = round4(existing.quantity + concepto.cantidad);
      existing.conceptos.push(concepto);
    } else {
      grouped.set(product.id, {
        product,
        quantity: concepto.cantidad || 1,
        unitCost: concepto.valorUnitario,
        conceptos: [concepto],
      });
    }
  }

  for (const { product, conceptos } of grouped.values()) {
    const ivaTraslado = conceptos[0]?.traslados.find((t) => t.impuesto === "002");
    const iepsTraslado = conceptos[0]?.traslados.find((t) => t.impuesto === "003");
    const ivaProducto = product.ivaRate ?? 0;
    const iepsProducto = product.iepsRate ?? 0;
    if (ivaTraslado?.tasaOCuota != null && Math.abs(ivaTraslado.tasaOCuota - ivaProducto) > 0.0001) {
      warnings.push(
        `IVA del producto "${product.code}" difiere del XML: sistema ${(ivaProducto * 100).toFixed(0)}%, XML ${(ivaTraslado.tasaOCuota * 100).toFixed(0)}%.`
      );
    }
    if (iepsTraslado?.tasaOCuota != null && Math.abs(iepsTraslado.tasaOCuota - iepsProducto) > 0.0001) {
      warnings.push(
        `IEPS del producto "${product.code}" difiere del XML: sistema ${(iepsProducto * 100).toFixed(0)}%, XML ${(iepsTraslado.tasaOCuota * 100).toFixed(0)}%.`
      );
    }
  }

  const serieFolio = [parsed.serie, parsed.folio].filter(Boolean).join("-");
  const emisorNombre = parsed.emisor.nombre ?? parsed.emisor.rfc;

  return {
    newProvider: parsed.emisor.rfc
      ? {
          rfc: parsed.emisor.rfc,
          name: emisorNombre,
          legalName: parsed.emisor.nombre ?? null,
          taxRegime: parsed.emisor.regimenFiscal ?? null,
        }
      : null,
    paymentMethodId: mapFormaPagoToPaymentMethod(parsed.formaPago, paymentMethods),
    lines: Array.from(grouped.values()).map(({ product, quantity, unitCost }) => ({
      product,
      quantity,
      unitCost,
    })),
    unmatched,
    warnings,
    metadata: {
      satUuid: parsed.uuid,
      supplierInvoiceNumber: serieFolio || null,
      invoiceDate: parsed.fecha,
      purchasedAt: parsed.fecha,
      xmlFileName,
    },
  };
}
