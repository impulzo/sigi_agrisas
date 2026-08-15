import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { AnticipoReceiptResponseDto } from "../../application/dto/AnticipoReceiptResponseDto";
import { pdfStyles as s } from "./pdfStyles";
import { formatDate } from "@/shared/infrastructure/formatters/formatDate";

function money(v: string): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(v));
}

/** Recibo imprimible de un anticipo/abono. */
export function AnticipoReceiptPdf({ data }: { data: AnticipoReceiptResponseDto }) {
  const { payment, customer, sale } = data;
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Recibo de Anticipo — {payment.folio}</Text>
          <Text style={s.headerMeta}>
            Generado: {formatDate(data.generatedAt)} | Por: {data.generatedBy.email}
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.departmentTitle}>Cliente</Text>
          <Text style={s.cell}>
            {customer.code} — {customer.name}
          </Text>
          {customer.address ? <Text style={s.cell}>{customer.address}</Text> : null}
        </View>

        <View style={s.section}>
          <Text style={s.departmentTitle}>Datos del abono</Text>
          <View style={s.tableRow}>
            <Text style={s.cellWide}>Folio</Text>
            <Text style={s.cell}>{payment.folio}</Text>
          </View>
          <View style={s.tableRow}>
            <Text style={s.cellWide}>Fecha</Text>
            <Text style={s.cell}>{formatDate(payment.date)}</Text>
          </View>
          <View style={s.tableRow}>
            <Text style={s.cellWide}>Forma de pago</Text>
            <Text style={s.cell}>
              {payment.paymentMethodCode} — {payment.paymentMethodName}
            </Text>
          </View>
          <View style={s.tableRow}>
            <Text style={s.cellWide}>Referencia</Text>
            <Text style={s.cell}>{payment.reference ?? "—"}</Text>
          </View>
          <View style={s.tableRow}>
            <Text style={s.cellWide}>Aplicado a</Text>
            <Text style={s.cell}>{sale.folio}</Text>
          </View>
          <View style={s.tableRow}>
            <Text style={s.cellWide}>Estado</Text>
            <Text style={s.cell}>
              {payment.status === "cancelled" ? "Cancelado" : payment.status}
            </Text>
          </View>
        </View>

        <View style={s.totals}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Monto del anticipo</Text>
            <Text style={s.totalsValue}>{money(payment.amount)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
