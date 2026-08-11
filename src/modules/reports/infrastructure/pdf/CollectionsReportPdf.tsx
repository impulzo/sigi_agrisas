import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  CollectionsReportResponseDto,
  CollectionsRowDto,
} from "../../application/dto/CollectionsReportResponseDto";
import { pdfStyles as s } from "./pdfStyles";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", { timeZone: "UTC" });
}

function groupByCustomer(rows: CollectionsRowDto[]): Map<string, CollectionsRowDto[]> {
  const map = new Map<string, CollectionsRowDto[]>();
  for (const r of rows) {
    const key = r.customerId;
    const bucket = map.get(key) ?? [];
    bucket.push(r);
    map.set(key, bucket);
  }
  return map;
}

export function CollectionsReportPdf({ data }: { data: CollectionsReportResponseDto }) {
  const grouped = groupByCustomer(data.rows);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.headerTitle}>Reporte de Cobranza por Cliente</Text>
          <Text style={s.headerMeta}>
            Periodo: {data.filters.from} — {data.filters.to} | Sucursal: {data.filters.branchId ?? "todas"}
          </Text>
          <Text style={s.headerMeta}>
            Fecha de emisión: {formatDate(data.generatedAt)} | Generado por: {data.generatedBy.email}
          </Text>
        </View>

        {data.rows.length === 0 ? (
          <Text style={s.emptyMessage}>Sin cobranza en el periodo</Text>
        ) : (
          [...grouped.entries()].map(([customerId, rows]) => (
            <View key={customerId} style={s.section}>
              <Text style={s.branchTitle}>{rows[0].customerName}</Text>
              <View style={s.tableHeader}>
                <Text style={s.cellWide}>Ticket</Text>
                <Text style={s.cell}>Forma de pago</Text>
                <Text style={s.cellNarrow}>Importe</Text>
                <Text style={s.cell}>Referencia</Text>
                <Text style={s.cell}>Fecha de cobro</Text>
              </View>
              {rows.map((r, i) => (
                <View key={r.paymentId} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <Text style={s.cellWide}>{r.factura}</Text>
                  <Text style={s.cell}>{r.paymentMethodName}</Text>
                  <Text style={s.cellNarrow}>{r.amount}</Text>
                  <Text style={s.cell}>{r.reference ?? ""}</Text>
                  <Text style={s.cell}>{formatDate(r.collectedAt)}</Text>
                </View>
              ))}
              <View style={s.subtotal}>
                <Text>
                  Subtotal cliente:{" "}
                  {rows.reduce((acc, r) => acc + Number(r.amount), 0).toFixed(4)}
                </Text>
              </View>
            </View>
          ))
        )}

        <View style={s.totals}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Total cobrado</Text>
            <Text style={s.totalsValue}>{data.totals.totalCollected}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>{data.generatedBy.email}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
