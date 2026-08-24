import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  CashCutReportResponseDto,
  CashCutRowDto,
} from "../../application/dto/CashCutReportResponseDto";
import { pdfStyles as s } from "./pdfStyles";
import { ReportHeader } from "./ReportHeader";
import type { PdfIssuer } from "@/shared/infrastructure/pdf/pdfIssuer";
import { ReportFooter } from "./ReportFooter";
import { formatDate } from "@/shared/infrastructure/formatters/formatDate";
import { rowStyle } from "@/shared/infrastructure/pdf/rowStyle";

function formatDateOnly(iso: string): string {
  return iso;
}

function CashCutRow({ r, alt }: { r: CashCutRowDto; alt: boolean }) {
  return (
    <View style={alt ? s.cashCutRowAlt : s.cashCutRow}>
      <Text style={s.cashCutCte}>{r.customerCode}</Text>
      <Text style={s.cashCutDocto}>{r.docto}</Text>
      <Text style={s.cashCutFactura}>{r.factura}</Text>
      <Text style={s.cashCutCliente}>{r.customerName}</Text>
      <Text style={s.cashCutFecFact}>{formatDateOnly(r.facturaDate)}</Text>
      <Text style={s.cashCutDias}>{r.days}</Text>
      <Text style={s.cashCutImporte}>{r.amount}</Text>
      <Text style={s.cashCutFp}>{r.paymentMethodName}</Text>
      <Text style={s.cashCutReferencia}>{r.reference ?? ""}</Text>
      <Text style={s.cashCutFCobro}>{formatDate(r.collectedAt)}</Text>
      <Text style={s.cashCutIva}>{r.ivaAmount}</Text>
      <Text style={s.cashCutTasa}>{r.taxRatePct}</Text>
    </View>
  );
}

interface Props {
  data: CashCutReportResponseDto;
  issuer: PdfIssuer;
}

export function CashCutReportPdf({ data, issuer }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <ReportHeader title="Corte de Caja — Recuperación de Cobranza" issuer={issuer}>
          <Text style={s.headerMeta}>
            Periodo: {data.filters.from} — {data.filters.to} | Sucursal:{" "}
            {data.filters.branchId ?? "todas"}
          </Text>
          <Text style={s.headerMeta}>
            Fecha de emisión: {formatDate(data.generatedAt)} | Generado por: {data.generatedBy.email}
          </Text>
        </ReportHeader>

        <View style={s.cashCutHeader} fixed>
          <Text style={s.cashCutCte}>Cte</Text>
          <Text style={s.cashCutDocto}>Docto</Text>
          <Text style={s.cashCutFactura}>Factura</Text>
          <Text style={s.cashCutCliente}>Nombre del cliente</Text>
          <Text style={s.cashCutFecFact}>Fec-Fact</Text>
          <Text style={s.cashCutDias}>Días</Text>
          <Text style={s.cashCutImporte}>Importe</Text>
          <Text style={s.cashCutFp}>Fp</Text>
          <Text style={s.cashCutReferencia}>Referencia</Text>
          <Text style={s.cashCutFCobro}>F. Cobro</Text>
          <Text style={s.cashCutIva}>I.V.A.</Text>
          <Text style={s.cashCutTasa}>Tasa%</Text>
        </View>

        {data.rows.length === 0 ? (
          <Text style={s.emptyMessage}>Sin cobranza en el periodo</Text>
        ) : (
          data.rows.map((r, i) => <CashCutRow key={r.paymentId} r={r} alt={i % 2 === 1} />)
        )}

        <View style={s.totals}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Total cobrado</Text>
            <Text style={s.totalsValue}>{data.totals.totalCollected}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Total IVA</Text>
            <Text style={s.totalsValue}>{data.totals.totalIva}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.departmentTitle}>Desglose por forma de pago</Text>
          {data.byPaymentMethod.length === 0 ? (
            <Text style={s.emptyMessage}>Sin datos</Text>
          ) : (
            <>
              <View style={s.tableHeader}>
                <Text style={s.cellWide}>Forma de pago</Text>
                <Text style={s.cellNarrow}>Conteo</Text>
                <Text style={s.cellNarrow}>Total</Text>
              </View>
              {data.byPaymentMethod.map((r, i) => (
                <View key={r.paymentMethodId} style={rowStyle(i, s.tableRow, s.tableRowAlt)}>
                  <Text style={s.cellWide}>{r.label}</Text>
                  <Text style={s.cellNarrow}>{r.count}</Text>
                  <Text style={s.cellNarrow}>{r.total}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <ReportFooter generatedByEmail={data.generatedBy.email} />
      </Page>
    </Document>
  );
}
