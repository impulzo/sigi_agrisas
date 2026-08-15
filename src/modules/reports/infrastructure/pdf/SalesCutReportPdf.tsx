import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  SalesCutReportResponseDto,
  SalesCutBreakdownRowDto,
  SalesCutProductBreakdownRowDto,
  SaleListRowDto,
} from "../../application/dto/SalesCutReportResponseDto";
import { pdfStyles as s } from "./pdfStyles";
import { formatDate } from "@/shared/infrastructure/formatters/formatDate";

function BreakdownBlock({ title, rows }: { title: string; rows: SalesCutBreakdownRowDto[] }) {
  return (
    <View style={s.section}>
      <Text style={s.departmentTitle}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={s.emptyMessage}>Sin datos</Text>
      ) : (
        <>
          <View style={s.tableHeader}>
            <Text style={s.cellWide}>Concepto</Text>
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

function ProductBreakdownBlock({ title, rows }: { title: string; rows: SalesCutProductBreakdownRowDto[] }) {
  return (
    <View style={s.section}>
      <Text style={s.departmentTitle}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={s.emptyMessage}>Sin datos</Text>
      ) : (
        <>
          <View style={s.tableHeader}>
            <Text style={s.cellWide}>Concepto</Text>
            <Text style={s.cellNarrow}>Tickets</Text>
            <Text style={s.cellNarrow}>Piezas</Text>
            <Text style={s.cellNarrow}>Subtotal</Text>
            <Text style={s.cellNarrow}>Impuestos</Text>
            <Text style={s.cellNarrow}>Total</Text>
          </View>
          {rows.map((r, i) => (
            <View key={r.key} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={s.cellWide}>{r.label}</Text>
              <Text style={s.cellNarrow}>{r.ticketCount}</Text>
              <Text style={s.cellNarrow}>{r.quantitySold}</Text>
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

function SalesListBlock({ rows }: { rows: SaleListRowDto[] }) {
  return (
    <View style={s.section}>
      <Text style={s.departmentTitle}>Detalle de tickets</Text>
      {rows.length === 0 ? (
        <Text style={s.emptyMessage}>Sin ventas</Text>
      ) : (
        <>
          <View style={s.tableHeader}>
            <Text style={s.cell}>Ticket</Text>
            <Text style={s.cellWide}>Cliente</Text>
            <Text style={s.cellNarrow}>Importe</Text>
            <Text style={s.cell}>Forma de pago</Text>
          </View>
          {rows.map((r, i) => (
            <View key={r.saleId} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={s.cell}>{r.folioCode}</Text>
              <Text style={s.cellWide}>{r.customerName ?? "—"}</Text>
              <Text style={s.cellNarrow}>{r.total}</Text>
              <Text style={s.cell}>{r.paymentMethodName}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

export function SalesCutReportPdf({ data }: { data: SalesCutReportResponseDto }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.headerTitle}>Corte de Ventas</Text>
          <Text style={s.headerMeta}>
            Periodo: {data.filters.from} — {data.filters.to} | Sucursal:{" "}
            {data.filters.branchId ?? "todas"}
          </Text>
          <Text style={s.headerMeta}>
            Generado: {formatDate(data.generatedAt)} | Por: {data.generatedBy.email}
          </Text>
        </View>

        <View style={s.totals}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Ventas (tickets)</Text>
            <Text style={s.totalsValue}>{data.totals.grossSales} ({data.totals.ticketCount})</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Subtotal</Text>
            <Text style={s.totalsValue}>{data.totals.subtotal}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>IVA</Text>
            <Text style={s.totalsValue}>{data.totals.ivaTotal}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>IEPS</Text>
            <Text style={s.totalsValue}>{data.totals.iepsTotal}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Canceladas (conteo)</Text>
            <Text style={s.totalsValue}>{data.cancelled.total} ({data.cancelled.count})</Text>
          </View>
        </View>

        <View style={s.totals}>
          <Text>Neto de caja</Text>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Ventas</Text>
            <Text style={s.totalsValue}>{data.cash.grossSales}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>+ Abonos cobrados</Text>
            <Text style={s.totalsValue}>{data.cash.paymentsReceived}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>− Devoluciones</Text>
            <Text style={s.totalsValue}>{data.cash.returnsRefunded}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>= Neto</Text>
            <Text style={s.totalsValue}>{data.cash.netCash}</Text>
          </View>
        </View>

        <BreakdownBlock title="Por método de pago" rows={data.byPaymentMethod} />
        <BreakdownBlock title="Por día" rows={data.byDay} />
        <BreakdownBlock title="Por cajero" rows={data.byCashier} />
        <BreakdownBlock title="Por sucursal" rows={data.byBranch} />
        <BreakdownBlock title="Por departamento" rows={data.byDepartment} />
        <ProductBreakdownBlock title="Por producto" rows={data.byProduct} />
        <SalesListBlock rows={data.salesList} />

        <View style={s.footer} fixed>
          <Text>{data.generatedBy.email}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
