import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  CashCutReportResponseDto,
  CashCutRowDto,
} from "../../application/dto/CashCutReportResponseDto";
import { pdfStyles as s } from "./pdfStyles";
import { formatDate } from "@/shared/infrastructure/formatters/formatDate";

function formatDateOnly(iso: string): string {
  return iso;
}

const cols = StyleSheet.create({
  header: {
    flexDirection: "row",
    backgroundColor: "#e0e0e0",
    padding: "3 2",
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
  },
  row: {
    flexDirection: "row",
    padding: "2 2",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
    fontSize: 7,
  },
  rowAlt: {
    flexDirection: "row",
    padding: "2 2",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
    backgroundColor: "#fafafa",
    fontSize: 7,
  },
  cte: { width: 35 },
  docto: { width: 55 },
  factura: { width: 55 },
  cliente: { width: 90 },
  fecFact: { width: 55 },
  dias: { width: 28, textAlign: "right" },
  importe: { width: 55, textAlign: "right" },
  fp: { width: 60 },
  referencia: { width: 90 },
  fCobro: { width: 55 },
  iva: { width: 45, textAlign: "right" },
  tasa: { width: 35, textAlign: "right" },
});

function CashCutRow({ r, alt }: { r: CashCutRowDto; alt: boolean }) {
  return (
    <View style={alt ? cols.rowAlt : cols.row}>
      <Text style={cols.cte}>{r.customerCode}</Text>
      <Text style={cols.docto}>{r.docto}</Text>
      <Text style={cols.factura}>{r.factura}</Text>
      <Text style={cols.cliente}>{r.customerName}</Text>
      <Text style={cols.fecFact}>{formatDateOnly(r.facturaDate)}</Text>
      <Text style={cols.dias}>{r.days}</Text>
      <Text style={cols.importe}>{r.amount}</Text>
      <Text style={cols.fp}>{r.paymentMethodName}</Text>
      <Text style={cols.referencia}>{r.reference ?? ""}</Text>
      <Text style={cols.fCobro}>{formatDate(r.collectedAt)}</Text>
      <Text style={cols.iva}>{r.ivaAmount}</Text>
      <Text style={cols.tasa}>{r.taxRatePct}</Text>
    </View>
  );
}

export function CashCutReportPdf({ data }: { data: CashCutReportResponseDto }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.headerTitle}>Corte de Caja — Recuperación de Cobranza</Text>
          <Text style={s.headerMeta}>
            Periodo: {data.filters.from} — {data.filters.to} | Sucursal:{" "}
            {data.filters.branchId ?? "todas"}
          </Text>
          <Text style={s.headerMeta}>
            Fecha de emisión: {formatDate(data.generatedAt)} | Generado por: {data.generatedBy.email}
          </Text>
        </View>

        <View style={cols.header} fixed>
          <Text style={cols.cte}>Cte</Text>
          <Text style={cols.docto}>Docto</Text>
          <Text style={cols.factura}>Factura</Text>
          <Text style={cols.cliente}>Nombre del cliente</Text>
          <Text style={cols.fecFact}>Fec-Fact</Text>
          <Text style={cols.dias}>Días</Text>
          <Text style={cols.importe}>Importe</Text>
          <Text style={cols.fp}>Fp</Text>
          <Text style={cols.referencia}>Referencia</Text>
          <Text style={cols.fCobro}>F. Cobro</Text>
          <Text style={cols.iva}>I.V.A.</Text>
          <Text style={cols.tasa}>Tasa%</Text>
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
                <View key={r.paymentMethodId} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <Text style={s.cellWide}>{r.label}</Text>
                  <Text style={s.cellNarrow}>{r.count}</Text>
                  <Text style={s.cellNarrow}>{r.total}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <View style={s.footer} fixed>
          <Text>{data.generatedBy.email}</Text>
          <Text render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
