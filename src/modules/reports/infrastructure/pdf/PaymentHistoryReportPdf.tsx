import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { PaymentHistoryReportResponseDto } from "../../application/dto/PaymentHistoryReportResponseDto";
import { pdfStyles as s } from "./pdfStyles";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", { timeZone: "UTC" });
}

export function PaymentHistoryReportPdf({ data }: { data: PaymentHistoryReportResponseDto }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.headerTitle}>Reporte de Historial de Abonos</Text>
          <Text style={s.headerMeta}>Generado: {formatDate(data.generatedAt)} | Por: {data.generatedBy.email}</Text>
          <Text style={s.headerMeta}>
            Filtros: sucursal={data.filters.branchId ?? "todas"} | cliente={data.filters.customerId ?? "todos"}
            {data.filters.startDate ? ` | desde=${data.filters.startDate}` : ""}
            {data.filters.endDate ? ` | hasta=${data.filters.endDate}` : ""}
          </Text>
        </View>

        {data.payments.length === 0 ? (
          <Text style={s.emptyMessage}>Sin abonos para los filtros aplicados</Text>
        ) : (
          <View style={s.section}>
            <View style={s.tableHeader}>
              <Text style={s.cell}>Folio Recibo</Text>
              <Text style={s.cell}>Folio Venta</Text>
              <Text style={s.cellWide}>Cliente</Text>
              <Text style={s.cell}>Sucursal</Text>
              <Text style={s.cellNarrow}>Monto</Text>
              <Text style={s.cell}>Fecha</Text>
              <Text style={s.cellNarrow}>Estado</Text>
            </View>
            {data.payments.map((p, i) => (
              <View key={p.paymentId} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={s.cell}>{p.folioNumber}</Text>
                <Text style={s.cell}>{p.saleFolioNumber}</Text>
                <Text style={s.cellWide}>{p.customerName}</Text>
                <Text style={s.cell}>{p.branchCode}</Text>
                <Text style={s.cellNarrow}>{p.amount}</Text>
                <Text style={s.cell}>{formatDate(p.paymentDate)}</Text>
                <Text style={[s.cellNarrow, p.status === "cancelled" ? s.badge : {}]}>
                  {p.status === "completed" ? "Completado" : "Cancelado"}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.totals}>
          <Text>Totales</Text>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Abonos completados</Text>
            <Text style={s.totalsValue}>{data.summary.totalPayments}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Monto bruto</Text>
            <Text style={s.totalsValue}>{data.summary.totalAmount}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Abonos cancelados</Text>
            <Text style={s.totalsValue}>{data.summary.cancelledPayments}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Monto cancelado</Text>
            <Text style={s.totalsValue}>{data.summary.cancelledAmount}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Monto neto</Text>
            <Text style={s.totalsValue}>{data.summary.netAmount}</Text>
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
