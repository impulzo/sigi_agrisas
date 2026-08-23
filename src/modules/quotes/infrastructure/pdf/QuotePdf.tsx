import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles as s } from "./pdfStyles";
import type { QuoteDetailDto } from "../../application/dto/QuoteDto";

export interface QuotePdfIssuer {
  businessName: string | null;
  businessRfc: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
}

interface QuotePdfProps {
  data: QuoteDetailDto;
  issuer: QuotePdfIssuer;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  authorized: "Autorizada",
  converted: "Convertida",
  cancelled: "Cancelada",
};

function money(n: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

function pct(n: number | null): string {
  return `${((n ?? 0) * 100).toFixed(0)}%`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(iso));
}

export function QuotePdf({ data, issuer }: QuotePdfProps) {
  const statusLabel = STATUS_LABELS[data.status] ?? data.status;
  const folioLabel = `${data.folioCode}-${data.folioNumber}`;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.issuerBlock}>
            <Text style={s.issuerName}>{issuer.businessName ?? "—"}</Text>
            {issuer.businessRfc && <Text style={s.issuerMeta}>RFC: {issuer.businessRfc}</Text>}
            {issuer.businessAddress && <Text style={s.issuerMeta}>{issuer.businessAddress}</Text>}
            {issuer.businessPhone && <Text style={s.issuerMeta}>Tel: {issuer.businessPhone}</Text>}
          </View>
          <View style={s.quoteMeta}>
            <Text style={s.quoteMetaLabel}>Cotización</Text>
            <Text style={s.quoteMetaValue}>{folioLabel}</Text>
            <Text style={s.quoteMetaStatus}>
              {statusLabel}
              {data.isExpired ? " (Vencida)" : ""}
            </Text>
            <Text style={s.quoteMetaLabel}>Emitida: {formatDate(data.createdAt)}</Text>
            <Text style={s.quoteMetaLabel}>Vence: {formatDate(data.expiresAt)}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Cliente</Text>
          <View style={s.customerGrid}>
            <View style={s.customerField}>
              <Text style={s.customerLabel}>Nombre</Text>
              <Text style={s.customerValue}>{data.customerName ?? "Cliente general"}</Text>
            </View>
            <View style={s.customerField}>
              <Text style={s.customerLabel}>RFC</Text>
              <Text style={s.customerValue}>{data.customerRfc ?? "—"}</Text>
            </View>
            <View style={s.customerField}>
              <Text style={s.customerLabel}>Sucursal</Text>
              <Text style={s.customerValue}>{data.branchName ?? "—"}</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <View style={s.tableHeader}>
            <Text style={s.colDescription}>Concepto</Text>
            <Text style={s.colQty}>Cant.</Text>
            <Text style={s.colPrice}>Precio</Text>
            <Text style={s.colDiscount}>Desc.</Text>
            <Text style={s.colTax}>IVA</Text>
            <Text style={s.colTotal}>Total</Text>
          </View>
          {data.items.map((item, idx) => (
            <View key={item.id} style={idx % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={s.colDescription}>
                {item.productNameSnapshot} ({item.productCodeSnapshot})
              </Text>
              <Text style={s.colQty}>{item.quantity}</Text>
              <Text style={s.colPrice}>{money(item.unitPrice)}</Text>
              <Text style={s.colDiscount}>{(item.discountPct ?? 0).toFixed(0)}%</Text>
              <Text style={s.colTax}>{pct(item.ivaRate)}</Text>
              <Text style={s.colTotal}>{money(item.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totalsBox}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Subtotal</Text>
            <Text style={s.totalsValue}>{money(data.subtotal)}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Impuestos</Text>
            <Text style={s.totalsValue}>{money(data.taxTotal)}</Text>
          </View>
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>Total</Text>
            <Text style={s.grandTotalValue}>{money(data.total)}</Text>
          </View>
        </View>

        {data.notes && (
          <View style={s.notesSection}>
            <Text style={s.notesLabel}>Notas</Text>
            <Text style={s.notesValue}>{data.notes}</Text>
          </View>
        )}

        <Text style={s.footer}>Documento informativo — no representa un comprobante fiscal.</Text>
      </Page>
    </Document>
  );
}
