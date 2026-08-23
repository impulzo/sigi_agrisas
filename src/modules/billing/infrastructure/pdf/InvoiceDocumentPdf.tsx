import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles as s } from "./pdfStyles";

export interface InvoiceDocumentPdfLine {
  description: string;
  productCode: string;
  satProductCode?: string | null;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  ivaRate: number;
  iepsRate: number;
  lineSubtotal: number;
  lineTotal: number;
}

export interface InvoiceDocumentPdfData {
  issuer: {
    name: string;
    branchName?: string | null;
    rfc?: string | null;
  };
  receiver: {
    rfc: string;
    name: string;
    cfdiUse: string;
    fiscalRegime: string;
    taxZipCode: string;
  };
  lines: InvoiceDocumentPdfLine[];
  paymentForm: string;
  paymentMethod: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  uuid?: string | null;
}

interface InvoiceDocumentPdfProps {
  data: InvoiceDocumentPdfData;
  watermark: string;
  folioLabel: string;
  isDraft?: boolean;
}

function money(n: number, currency: string): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(n);
}

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

export function InvoiceDocumentPdf({ data, watermark, folioLabel, isDraft = false }: InvoiceDocumentPdfProps) {
  const ivaTotal = data.lines.reduce((sum, l) => sum + l.lineSubtotal * l.ivaRate, 0);
  const iepsTotal = data.lines.reduce((sum, l) => sum + l.lineSubtotal * l.iepsRate, 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.watermarkBanner}>{watermark}</Text>

        <View style={s.header}>
          <View style={s.issuerBlock}>
            <View>
              <Text style={s.issuerName}>{data.issuer.name}</Text>
              {data.issuer.branchName && <Text style={s.issuerMeta}>{data.issuer.branchName}</Text>}
              {data.issuer.rfc && <Text style={s.issuerMeta}>RFC: {data.issuer.rfc}</Text>}
            </View>
          </View>
          <View style={s.invoiceMeta}>
            <Text style={s.invoiceMetaLabel}>Folio</Text>
            <Text style={s.invoiceMetaValue}>{folioLabel}</Text>
            {data.uuid && (
              <>
                <Text style={s.invoiceMetaLabel}>UUID</Text>
                <Text style={s.invoiceMetaValue}>{data.uuid}</Text>
              </>
            )}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Receptor</Text>
          <View style={s.receiverGrid}>
            <View style={s.receiverField}>
              <Text style={s.receiverLabel}>RFC</Text>
              <Text style={s.receiverValue}>{data.receiver.rfc}</Text>
            </View>
            <View style={s.receiverField}>
              <Text style={s.receiverLabel}>Nombre</Text>
              <Text style={s.receiverValue}>{data.receiver.name}</Text>
            </View>
            <View style={s.receiverField}>
              <Text style={s.receiverLabel}>Uso CFDI</Text>
              <Text style={s.receiverValue}>{data.receiver.cfdiUse || "—"}</Text>
            </View>
            <View style={s.receiverField}>
              <Text style={s.receiverLabel}>Régimen fiscal</Text>
              <Text style={s.receiverValue}>{data.receiver.fiscalRegime || "—"}</Text>
            </View>
            <View style={s.receiverField}>
              <Text style={s.receiverLabel}>Código postal</Text>
              <Text style={s.receiverValue}>{data.receiver.taxZipCode || "—"}</Text>
            </View>
            <View style={s.receiverField}>
              <Text style={s.receiverLabel}>Forma / método de pago</Text>
              <Text style={s.receiverValue}>{data.paymentForm} / {data.paymentMethod}</Text>
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
          {data.lines.map((line, idx) => (
            <View key={`${line.productCode}-${idx}`} style={idx % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={s.colDescription}>{line.description}</Text>
              <Text style={s.colQty}>{line.quantity}</Text>
              <Text style={s.colPrice}>{money(line.unitPrice, data.currency)}</Text>
              {/* discountPct is already whole-percent scale (0-100); ivaRate/iepsRate are
                  fraction scale (0-1) and go through pct() to become whole-percent for display.
                  WYSIWYG parity with InvoicePreviewModal is maintained by applying the same
                  fix there. */}
              <Text style={s.colDiscount}>{line.discountPct.toFixed(0)}%</Text>
              <Text style={s.colTax}>{pct(line.ivaRate)}</Text>
              <Text style={s.colTotal}>{money(line.lineTotal, data.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={s.taxBreakdown}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>IVA</Text>
            <Text style={s.totalsValue}>{money(ivaTotal, data.currency)}</Text>
          </View>
          {iepsTotal > 0 && (
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>IEPS</Text>
              <Text style={s.totalsValue}>{money(iepsTotal, data.currency)}</Text>
            </View>
          )}
        </View>

        <View style={s.totalsBox}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Subtotal</Text>
            <Text style={s.totalsValue}>{money(data.subtotal, data.currency)}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Impuestos</Text>
            <Text style={s.totalsValue}>{money(data.taxTotal, data.currency)}</Text>
          </View>
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>Total</Text>
            <Text style={s.grandTotalValue}>{money(data.total, data.currency)}</Text>
          </View>
        </View>

        {!isDraft && (
          <View style={s.fiscalFooter}>
            <View style={s.fiscalFooterRow}>
              <Text style={s.fiscalFooterLabel}>Sello digital:</Text>
              <Text style={s.fiscalFooterValue}>{watermark}</Text>
            </View>
            <View style={s.fiscalFooterRow}>
              <Text style={s.fiscalFooterLabel}>Cadena original:</Text>
              <Text style={s.fiscalFooterValue}>||4.0|{folioLabel}|{data.receiver.rfc}||</Text>
            </View>
            <View style={s.qrPlaceholder}>
              <Text style={s.qrPlaceholderText}>QR</Text>
            </View>
          </View>
        )}

        <Text style={s.watermarkFooter}>{watermark}</Text>
      </Page>
    </Document>
  );
}
