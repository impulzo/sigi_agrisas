import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { ProviderPaymentsReportResponseDto } from "../../application/dto/ProviderPaymentsReportResponseDto";
import { pdfStyles as s } from "./pdfStyles";
import { ReportHeader } from "./ReportHeader";
import type { PdfIssuer } from "@/shared/infrastructure/pdf/pdfIssuer";
import { ReportFooter } from "./ReportFooter";
import { formatDate } from "@/shared/infrastructure/formatters/formatDate";
import { rowStyle } from "@/shared/infrastructure/pdf/rowStyle";

interface Props {
  data: ProviderPaymentsReportResponseDto;
  issuer: PdfIssuer;
}

export function ProviderPaymentsReportPdf({ data, issuer }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <ReportHeader title="Reporte de Pagos a Proveedores" issuer={issuer}>
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
          <Text style={s.emptyMessage}>Sin pagos a proveedores para los filtros aplicados</Text>
        ) : (
          <View style={s.section}>
            <View style={s.tableHeader}>
              <Text style={s.cell}>Folio pago</Text>
              <Text style={s.cell}>Folio compra</Text>
              <Text style={s.cellWide}>Proveedor</Text>
              <Text style={s.cell}>Sucursal</Text>
              <Text style={s.cellNarrow}>Monto</Text>
              <Text style={s.cell}>Estado</Text>
              <Text style={s.cell}>Fecha</Text>
              <Text style={s.cellNarrow}>Saldo inicial</Text>
              <Text style={s.cellNarrow}>Saldo actual</Text>
            </View>
            {data.rows.map((r, i) => (
              <View key={r.id} style={rowStyle(i, s.tableRow, s.tableRowAlt)}>
                <Text style={s.cell}>{r.folioCode}</Text>
                <Text style={s.cell}>{r.purchaseFolioCode}</Text>
                <Text style={s.cellWide}>{r.providerName ?? "—"}</Text>
                <Text style={s.cell}>{r.branchName ?? "—"}</Text>
                <Text style={s.cellNarrow}>{r.amount}</Text>
                <Text style={[s.cell, r.status === "cancelled" ? s.badge : {}]}>{r.status}</Text>
                <Text style={s.cell}>{formatDate(r.paidAt)}</Text>
                <Text style={s.cellNarrow}>{r.providerInitialBalance ?? "—"}</Text>
                <Text style={s.cellNarrow}>{r.providerCurrentBalance ?? "—"}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.totals}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Pagos</Text>
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
