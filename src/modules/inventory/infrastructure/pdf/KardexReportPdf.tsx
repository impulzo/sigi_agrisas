import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { KardexReportResponseDto } from "../../application/dto/KardexReportResponseDto";
import { MOVEMENT_TYPE_LABELS, InventoryMovementType } from "../../domain/entities/InventoryMovement";
import { styles } from "./pdfStyles";

interface Props {
  data: KardexReportResponseDto;
  from: string;
  to: string;
}

function formatDateTime(iso: string): string {
  return iso.substring(0, 16).replace("T", " ");
}

export function KardexReportPdf({ data, from, to }: Props) {
  const { product, header, movements } = data;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Kardex — {product.code} · {product.name}</Text>
        <Text style={styles.subtitle}>
          Periodo: {from} a {to} · Unidad: {product.unitDescription ?? product.unit}
        </Text>

        <View style={styles.headerSection}>
          <View style={styles.headerCard}>
            <Text style={styles.headerCardLabel}>Existencia total</Text>
            <Text style={styles.headerCardValue}>{header.existenciaTotal}</Text>
          </View>
          <View style={styles.headerCard}>
            <Text style={styles.headerCardLabel}>Existencia almacén</Text>
            <Text style={styles.headerCardValue}>{header.existenciaAlmacen}</Text>
          </View>
          <View style={styles.headerCard}>
            <Text style={styles.headerCardLabel}>Saldo anterior</Text>
            <Text style={styles.headerCardValue}>{header.saldoAnterior}</Text>
          </View>
          <View style={styles.headerCard}>
            <Text style={styles.headerCardLabel}>Saldo final</Text>
            <Text style={styles.headerCardValue}>{header.saldoFinal}</Text>
          </View>
        </View>

        {movements.length === 0 ? (
          <Text style={styles.emptyMsg}>Sin movimientos para el rango seleccionado</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colFecha, styles.headerCol]}>Fecha</Text>
              <Text style={[styles.colMovimiento, styles.headerCol]}>Movimiento</Text>
              <Text style={[styles.colFolio, styles.headerCol]}>Folio</Text>
              <Text style={[styles.colEntrada, styles.headerCol]}>Entrada</Text>
              <Text style={[styles.colSalida, styles.headerCol]}>Salida</Text>
              <Text style={[styles.colSaldo, styles.headerCol]}>Saldo</Text>
              <Text style={[styles.colCosto, styles.headerCol]}>Costo</Text>
              <Text style={[styles.colVenta, styles.headerCol]}>Venta</Text>
              <Text style={[styles.colStatus, styles.headerCol]}>Status</Text>
            </View>
            {movements.map((m, idx) => (
              <View
                key={idx}
                style={[styles.tableRow, ...(idx % 2 === 0 ? [styles.tableRowEven] : [])]}
              >
                <Text style={styles.colFecha}>{formatDateTime(m.movementAt)}</Text>
                <Text style={styles.colMovimiento}>{MOVEMENT_TYPE_LABELS[m.movementType as InventoryMovementType]}</Text>
                <Text style={styles.colFolio}>{m.folioCode ?? "—"}</Text>
                <Text style={styles.colEntrada}>{m.entrada || ""}</Text>
                <Text style={styles.colSalida}>{m.salida || ""}</Text>
                <Text style={styles.colSaldo}>{m.saldo}</Text>
                <Text style={styles.colCosto}>{m.unitCost ?? "—"}</Text>
                <Text style={styles.colVenta}>{m.unitPrice ?? "—"}</Text>
                <Text style={styles.colStatus}>{m.status}</Text>
              </View>
            ))}
          </View>
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
