import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { AnticipoReceiptResponseDto } from "../../application/dto/AnticipoReceiptResponseDto";
import { pdfStyles as s } from "./pdfStyles";
import { ReportHeader } from "./ReportHeader";
import type { PdfIssuer } from "@/shared/infrastructure/pdf/pdfIssuer";
import { formatDate } from "@/shared/infrastructure/formatters/formatDate";
import { formatPdfCurrency } from "@/shared/infrastructure/formatters/formatPdfCurrency";

function money(v: string): string {
  return formatPdfCurrency(Number(v));
}

interface Props {
  data: AnticipoReceiptResponseDto;
  issuer: PdfIssuer;
}

/** Recibo imprimible de un anticipo/abono. */
export function AnticipoReceiptPdf({ data, issuer }: Props) {
  const { payment, customer, sale } = data;
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <ReportHeader title={`Recibo de Anticipo — ${payment.folio}`} issuer={issuer} logoSize={40}>
          <Text style={s.headerMeta}>
            Generado: {formatDate(data.generatedAt)} | Por: {data.generatedBy.email}
          </Text>
        </ReportHeader>

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
