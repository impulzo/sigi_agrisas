import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { SalesByProductReportResponseDto, SalesByProductBreakdownRowDto, SalesByProductRowDto } from "../../application/dto/SalesByProductReportResponseDto";
import { pdfStyles as s } from "./pdfStyles";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", { timeZone: "UTC" });
}

function Breakdown({ title, rows }: { title: string; rows: SalesByProductBreakdownRowDto[] }) {
  return (
    <View style={s.section}>
      <Text style={s.departmentTitle}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={s.emptyMessage}>Sin datos</Text>
      ) : (
        <>
          <View style={s.tableHeader}>
            <Text style={s.cellWide}>Nombre</Text>
            <Text style={s.cellNarrow}>Tickets</Text>
            <Text style={s.cellNarrow}>Subtotal</Text>
            <Text style={s.cellNarrow}>Impuestos</Text>
            <Text style={s.cellNarrow}>Total</Text>
          </View>
          {rows.map((r, i) => (
            <View key={r.key} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={s.cellWide}>{r.label}</Text>
              <Text style={s.cellNarrow}>{r.ticketCount}</Text>
              <Text style={s.cellNarrow}>{r.subtotal}</Text>
              <Text style={s.cellNarrow}>{r.taxTotal}</Text>
              <Text style={s.cellNarrow}>{r.total}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function ProductBreakdown({ rows }: { rows: SalesByProductRowDto[] }) {
  return (
    <View style={s.section}>
      <Text style={s.departmentTitle}>Por producto (cruce inventario × ventas)</Text>
      {rows.length === 0 ? (
        <Text style={s.emptyMessage}>Sin datos</Text>
      ) : (
        <>
          <View style={s.tableHeader}>
            <Text style={s.cellWide}>Producto</Text>
            <Text style={s.cellNarrow}>Tickets</Text>
            <Text style={s.cellNarrow}>Piezas vendidas</Text>
            <Text style={s.cellNarrow}>Stock actual</Text>
            <Text style={s.cellNarrow}>Total</Text>
          </View>
          {rows.map((r, i) => (
            <View key={r.key} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={s.cellWide}>{r.label}</Text>
              <Text style={s.cellNarrow}>{r.ticketCount}</Text>
              <Text style={s.cellNarrow}>{r.quantitySold}</Text>
              <Text style={s.cellNarrow}>{r.currentStock}</Text>
              <Text style={s.cellNarrow}>{r.total}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

export function SalesByProductReportPdf({ data }: { data: SalesByProductReportResponseDto }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.headerTitle}>Reporte de Ventas por Producto</Text>
          <Text style={s.headerMeta}>
            Periodo: {data.filters.from} — {data.filters.to} | Sucursal: {data.filters.branchId ?? "todas"}
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

        <Breakdown title="Por cliente" rows={data.byCustomer} />
        <Breakdown title="Por departamento" rows={data.byDepartment} />
        <ProductBreakdown rows={data.byProduct} />

        <View style={s.footer} fixed>
          <Text>{data.generatedBy.email}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
