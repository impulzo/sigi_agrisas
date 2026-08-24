import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { PurchasesReportResponseDto } from "../../application/dto/PurchasesReportResponseDto";
import { pdfStyles as s } from "./pdfStyles";
import { ReportHeader } from "./ReportHeader";
import type { PdfIssuer } from "@/shared/infrastructure/pdf/pdfIssuer";
import { ReportFooter } from "./ReportFooter";
import { formatDate } from "@/shared/infrastructure/formatters/formatDate";
import { rowStyle } from "@/shared/infrastructure/pdf/rowStyle";

interface Props {
  data: PurchasesReportResponseDto;
  issuer: PdfIssuer;
}

export function PurchasesReportPdf({ data, issuer }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <ReportHeader title="Reporte de Compras" issuer={issuer}>
          <Text style={s.headerMeta}>
            Generado: {formatDate(data.generatedAt)} | Por: {data.generatedBy.email}
          </Text>
          <Text style={s.headerMeta}>
            Filtros: sucursal={data.filters.branchId ?? "todas"} | proveedor={data.filters.providerId ?? "todos"} |
            estado={data.filters.status ?? "todos"}
            {data.filters.from ? ` | desde=${data.filters.from}` : ""}
            {data.filters.to ? ` | hasta=${data.filters.to}` : ""}
          </Text>
        </ReportHeader>

        {data.rows.length === 0 ? (
          <Text style={s.emptyMessage}>Sin compras para los filtros aplicados</Text>
        ) : (
          <View style={s.section}>
            <View style={s.tableHeader}>
              <Text style={s.cell}>Folio</Text>
              <Text style={s.cellWide}>Proveedor</Text>
              <Text style={s.cell}>Sucursal</Text>
              <Text style={s.cellNarrow}>Subtotal</Text>
              <Text style={s.cellNarrow}>Impuestos</Text>
              <Text style={s.cellNarrow}>Total</Text>
              <Text style={s.cellNarrow}>Pagado</Text>
              <Text style={s.cellNarrow}>Saldo</Text>
              <Text style={s.cell}>Estado pago</Text>
              <Text style={s.cell}>Estado</Text>
              <Text style={s.cell}>Fecha</Text>
            </View>
            {data.rows.map((r, i) => (
              <View key={r.id} style={rowStyle(i, s.tableRow, s.tableRowAlt)}>
                <Text style={s.cell}>{r.folioCode}</Text>
                <Text style={s.cellWide}>{r.providerName ?? "—"}</Text>
                <Text style={s.cell}>{r.branchName ?? "—"}</Text>
                <Text style={s.cellNarrow}>{r.subtotal}</Text>
                <Text style={s.cellNarrow}>{r.taxTotal}</Text>
                <Text style={s.cellNarrow}>{r.total}</Text>
                <Text style={s.cellNarrow}>{r.paidAmount}</Text>
                <Text style={s.cellNarrow}>{r.balance}</Text>
                <Text style={[s.cell, r.paymentStatus === "pending" ? s.badge : {}]}>{r.paymentStatus}</Text>
                <Text style={[s.cell, r.status === "cancelled" ? s.badge : {}]}>{r.status}</Text>
                <Text style={s.cell}>{formatDate(r.purchasedAt)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.totals}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Compras</Text>
            <Text style={s.totalsValue}>{data.totals.count}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Total</Text>
            <Text style={s.totalsValue}>{data.totals.total}</Text>
          </View>
        </View>

        <ReportFooter generatedByEmail={data.generatedBy.email} />
      </Page>
    </Document>
  );
}
