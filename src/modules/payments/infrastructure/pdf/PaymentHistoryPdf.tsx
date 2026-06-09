import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { PaymentHistoryReportDto } from "../../application/dto/PaymentDto";
import { styles } from "./pdfStyles";

interface Props {
  data: PaymentHistoryReportDto;
}

function formatDate(iso: string): string {
  return iso.substring(0, 10);
}

function formatDateTime(iso: string): string {
  return iso.substring(0, 16).replace("T", " ");
}

export function PaymentHistoryPdf({ data }: Props) {
  const { generatedAt, generatedBy, filters, items, totals } = data;

  const activeFilters: string[] = [];
  if (filters.userId) activeFilters.push(`Cobrador: ${filters.userId}`);
  if (filters.saleId) activeFilters.push(`Ticket: ${filters.saleId}`);
  if (filters.customerId) activeFilters.push(`Cliente: ${filters.customerId}`);
  if (filters.productId) activeFilters.push(`Producto: ${filters.productId}`);
  if (filters.paymentMethodId) activeFilters.push(`Método: ${filters.paymentMethodId}`);
  if (filters.from) activeFilters.push(`Desde: ${filters.from}`);
  if (filters.to) activeFilters.push(`Hasta: ${filters.to}`);
  if (filters.branchId) activeFilters.push(`Sucursal: ${filters.branchId}`);
  if (filters.status && filters.status.length > 0) activeFilters.push(`Estado: ${filters.status.join(", ")}`);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Historial de Abonos</Text>
        <Text style={styles.subtitle}>
          Generado: {formatDateTime(generatedAt)} · Por: {generatedBy.email}
        </Text>

        {activeFilters.length > 0 && (
          <View style={styles.filtersSection}>
            <Text style={styles.filtersTitle}>Filtros aplicados:</Text>
            <View style={styles.filterChips}>
              {activeFilters.map((f, i) => (
                <View key={i} style={styles.chip}>
                  <Text>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {items.length === 0 ? (
          <Text style={styles.emptyMsg}>Sin datos para los filtros aplicados</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colDate, styles.headerCol]}>Fecha</Text>
              <Text style={[styles.colRecibo, styles.headerCol]}>Recibo</Text>
              <Text style={[styles.colTicket, styles.headerCol]}>Ticket</Text>
              <Text style={[styles.colCliente, styles.headerCol]}>Cliente</Text>
              <Text style={[styles.colCobrador, styles.headerCol]}>Cobrador</Text>
              <Text style={[styles.colMetodo, styles.headerCol]}>Método</Text>
              <Text style={[styles.colMonto, styles.headerCol]}>Monto</Text>
              <Text style={[styles.colEstado, styles.headerCol]}>Estado</Text>
            </View>
            {items.map((item, idx) => (
              <View
                key={item.id}
                style={[styles.tableRow, ...(idx % 2 === 0 ? [styles.tableRowEven] : [])]}
              >
                <Text style={styles.colDate}>{formatDate(item.createdAt)}</Text>
                <Text style={styles.colRecibo}>{item.folioCode}</Text>
                <Text style={styles.colTicket}>{item.saleFolioCode}</Text>
                <Text style={styles.colCliente}>{item.customerName}</Text>
                <Text style={styles.colCobrador}>{item.userName}</Text>
                <Text style={styles.colMetodo}>{item.paymentMethodCode}</Text>
                <Text style={styles.colMonto}>${item.amount}</Text>
                <Text style={styles.colEstado}>{item.status}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.totalsSection}>
          <Text style={styles.totalsTitle}>Totales</Text>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total registros:</Text>
            <Text style={styles.totalsValue}>{totals.rowCount}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Completados ({totals.completedCount}):</Text>
            <Text style={styles.totalsValue}>${totals.totalAmountCompleted}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Cancelados ({totals.cancelledCount}):</Text>
            <Text style={styles.totalsValue}>${totals.totalAmountCancelled}</Text>
          </View>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
