import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { pdfStyles as s } from "./pdfStyles";

interface ReportFooterProps {
  generatedByEmail: string;
}

/** Footer compartido: email de quien generó el reporte + numeración de página,
 * siempre en formato "Página X de Y" (normaliza la variante "Pág." que tenía
 * CashCutReportPdf, sin respaldo de spec y en desacuerdo con los 3 reportes
 * cuyo spec sí fija "Página X de Y" como formato correcto). */
export function ReportFooter({ generatedByEmail }: ReportFooterProps) {
  return (
    <View style={s.footer} fixed>
      <Text>{generatedByEmail}</Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );
}
