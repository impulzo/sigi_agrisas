import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { pdfStyles as s } from "./pdfStyles";
import { PdfLogo } from "@/shared/infrastructure/pdf/PdfLogo";
import type { PdfIssuer } from "@/shared/infrastructure/pdf/pdfIssuer";

interface ReportHeaderProps {
  title: string;
  issuer: PdfIssuer;
  logoSize?: number;
  children?: React.ReactNode;
}

/** Header compartido por los reportes de este módulo: logo + datos fiscales del
 * emisor (razón social, dirección, RFC) + título + meta-líneas custom
 * (filtros/período), pasadas como children para que cada reporte controle su
 * propio contenido exacto sin forzar un shape de "filtros" genérico. */
export function ReportHeader({ title, issuer, logoSize = 20, children }: ReportHeaderProps) {
  return (
    <View style={s.header} fixed>
      <View style={s.issuerRow}>
        <PdfLogo logoUrl={issuer.logoUrl} size={logoSize} />
        <View style={s.issuerBlock}>
          {issuer.businessName && <Text style={s.issuerName}>{issuer.businessName}</Text>}
          {issuer.businessAddress && <Text style={s.issuerMeta}>{issuer.businessAddress}</Text>}
          {issuer.businessRfc && <Text style={s.issuerMeta}>RFC: {issuer.businessRfc}</Text>}
        </View>
      </View>
      <Text style={s.headerTitle}>{title}</Text>
      {children}
    </View>
  );
}
