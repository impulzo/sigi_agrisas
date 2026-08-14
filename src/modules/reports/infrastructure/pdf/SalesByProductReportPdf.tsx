import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { SalesByProductReportResponseDto } from "../../application/dto/SalesByProductReportResponseDto";
import { pdfStyles as s } from "./pdfStyles";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", { timeZone: "UTC" });
}

export function SalesByProductReportPdf({ data }: { data: SalesByProductReportResponseDto }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.headerTitle}>Reporte de Ventas por Producto</Text>
          <Text style={s.headerMeta}>
            Periodo: {data.filters.from} — {data.filters.to} | Sucursal: {data.filters.branchId ?? "todas"} |
            Cliente: {data.filters.customerId ?? "todos"}
          </Text>
          <Text style={s.headerMeta}>
            Fecha de emisión: {formatDate(data.generatedAt)} | Generado por: {data.generatedBy.email}
          </Text>
        </View>

        <View style={s.totals}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Tickets</Text>
            <Text style={s.totalsValue}>{data.totals.ticketCount}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Total</Text>
            <Text style={s.totalsValue}>{data.totals.total}</Text>
          </View>
        </View>

        {data.rows.length === 0 ? (
          <Text style={s.emptyMessage}>Sin datos</Text>
        ) : (
          <View style={s.section}>
            <View style={s.tableHeader}>
              <Text style={s.cell}>Departamento</Text>
              <Text style={s.cellWide}>Producto</Text>
              <Text style={s.cellWide}>Cliente</Text>
              <Text style={s.cellNarrow}>Cantidad</Text>
              <Text style={s.cellNarrow}>Monto</Text>
            </View>
            {data.rows.map((r, i) => (
              <View key={`${r.departmentId}-${r.productId}-${r.customerId ?? "sin-cliente"}`} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={s.cell}>{r.departmentName}</Text>
                <Text style={s.cellWide}>{`${r.productName} (${r.productCode})`}</Text>
                <Text style={s.cellWide}>{r.customerName}</Text>
                <Text style={s.cellNarrow}>{r.quantity}</Text>
                <Text style={s.cellNarrow}>{r.total}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.footer} fixed>
          <Text>{data.generatedBy.email}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
