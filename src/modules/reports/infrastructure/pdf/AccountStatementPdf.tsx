import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { AccountStatementSummaryResponseDto } from "../../application/dto/AccountStatementSummaryResponseDto";
import { AccountStatementLedgerResponseDto } from "../../application/dto/AccountStatementLedgerResponseDto";
import { pdfStyles as s } from "./pdfStyles";
import { formatDate } from "@/shared/infrastructure/formatters/formatDate";

const TYPE_LABEL: Record<string, string> = {
  sale_credit: "Venta crédito",
  sale_cash: "Venta contado",
  payment: "Abono",
};

/** Resumen multi-cliente. */
export function AccountStatementSummaryPdf({
  data,
}: {
  data: AccountStatementSummaryResponseDto;
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.headerTitle}>Estados de Cuenta — Resumen</Text>
          <Text style={s.headerMeta}>
            Generado: {formatDate(data.generatedAt)} | Por: {data.generatedBy.email}
          </Text>
          <Text style={s.headerMeta}>
            Filtros: sucursal={data.filters.branchId ?? "todas"}
            {data.filters.onlyWithBalance ? " | solo con saldo" : ""}
            {data.filters.from ? ` | desde=${data.filters.from}` : ""}
            {data.filters.to ? ` | hasta=${data.filters.to}` : ""}
          </Text>
        </View>

        {data.items.length === 0 ? (
          <Text style={s.emptyMessage}>Sin clientes para los filtros aplicados</Text>
        ) : (
          <View style={s.section}>
            <View style={s.tableHeader}>
              <Text style={s.cell}>Código</Text>
              <Text style={s.cellWide}>Cliente</Text>
              <Text style={s.cellNarrow}>Cargado</Text>
              <Text style={s.cellNarrow}>Abonado</Text>
              <Text style={s.cellNarrow}>Saldo</Text>
              <Text style={s.cellNarrow}>Límite</Text>
              <Text style={s.cellNarrow}>Disponible</Text>
            </View>
            {data.items.map((r, i) => (
              <View key={r.customerId} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={s.cell}>{r.customerCode}</Text>
                <Text style={s.cellWide}>{r.customerName}</Text>
                <Text style={s.cellNarrow}>{r.totalCharged}</Text>
                <Text style={s.cellNarrow}>{r.totalPaid}</Text>
                <Text style={s.cellNarrow}>{r.currentBalance}</Text>
                <Text style={s.cellNarrow}>{r.creditLimit ?? "—"}</Text>
                <Text style={s.cellNarrow}>{r.availableCredit ?? "—"}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.totals}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Clientes</Text>
            <Text style={s.totalsValue}>{data.totals.customerCount}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Total cargado (página)</Text>
            <Text style={s.totalsValue}>{data.totals.totalCharged}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Total abonado (página)</Text>
            <Text style={s.totalsValue}>{data.totals.totalPaid}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Saldo total (página)</Text>
            <Text style={s.totalsValue}>{data.totals.totalBalance}</Text>
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

/** Desglose (libro mayor) de un cliente. */
export function AccountStatementLedgerPdf({
  data,
}: {
  data: AccountStatementLedgerResponseDto;
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.headerTitle}>Estado de Cuenta — {data.customer.name}</Text>
          <Text style={s.headerMeta}>
            Código: {data.customer.code} | Generado: {formatDate(data.generatedAt)} | Por:{" "}
            {data.generatedBy.email}
          </Text>
          <Text style={s.headerMeta}>
            Saldo inicial: {data.openingBalance} | Saldo actual: {data.customer.currentBalance} |
            Límite: {data.customer.creditLimit ?? "—"} | Disponible:{" "}
            {data.customer.availableCredit ?? "—"}
            {data.filters.from ? ` | desde=${data.filters.from}` : ""}
            {data.filters.to ? ` | hasta=${data.filters.to}` : ""}
          </Text>
        </View>

        {data.movements.length === 0 ? (
          <Text style={s.emptyMessage}>Sin movimientos para el periodo</Text>
        ) : (
          <View style={s.section}>
            <View style={s.tableHeader}>
              <Text style={s.cell}>Fecha</Text>
              <Text style={s.cell}>Tipo</Text>
              <Text style={s.cell}>Folio</Text>
              <Text style={s.cellNarrow}>Cargo</Text>
              <Text style={s.cellNarrow}>Abono</Text>
              <Text style={s.cellNarrow}>Saldo</Text>
              <Text style={s.cellNarrow}>Estado</Text>
            </View>
            {data.movements.map((m, i) => (
              <View key={m.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={s.cell}>{formatDate(m.date)}</Text>
                <Text style={s.cell}>{TYPE_LABEL[m.type] ?? m.type}</Text>
                <Text style={s.cell}>{m.folio}</Text>
                <Text style={s.cellNarrow}>{m.debit}</Text>
                <Text style={s.cellNarrow}>{m.credit}</Text>
                <Text style={s.cellNarrow}>{m.runningBalance}</Text>
                <Text style={[s.cellNarrow, m.status === "cancelled" ? s.badge : {}]}>
                  {m.status === "cancelled" ? "Cancelado" : m.status}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.totals}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Movimientos</Text>
            <Text style={s.totalsValue}>{data.totals.movementCount}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Total cargos</Text>
            <Text style={s.totalsValue}>{data.totals.totalDebit}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Total abonos</Text>
            <Text style={s.totalsValue}>{data.totals.totalCredit}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Saldo final</Text>
            <Text style={s.totalsValue}>{data.closingBalance}</Text>
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
