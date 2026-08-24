import { StyleSheet } from "@react-pdf/renderer";
import { simpleListPdfStyles } from "@/shared/infrastructure/pdf/simpleListPdfStyles";
import { PDF_COLORS } from "@/shared/infrastructure/pdf/pdfTheme";

export const styles = StyleSheet.create({
  ...simpleListPdfStyles,
  issuerRow: { flexDirection: "row", gap: 6, alignItems: "flex-start", marginBottom: 4 },
  issuerBlock: { flexDirection: "column", gap: 1 },
  issuerName: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  issuerMeta: { fontSize: 7, color: PDF_COLORS.onSurfaceVariant },
  headerSection: { marginBottom: 12, flexDirection: "row", gap: 16 },
  headerCard: { borderWidth: 0.5, borderColor: PDF_COLORS.outlineVariant, borderRadius: 3, padding: 6, flex: 1 },
  headerCardLabel: { fontSize: 8, color: PDF_COLORS.onSurfaceVariant },
  headerCardValue: { fontSize: 12, fontWeight: "bold" },
  colFecha: { width: "12%", fontSize: 7 },
  colMovimiento: { width: "16%", fontSize: 7 },
  colFolio: { width: "12%", fontSize: 7 },
  colEntrada: { width: "10%", fontSize: 7, textAlign: "right" },
  colSalida: { width: "10%", fontSize: 7, textAlign: "right" },
  colSaldo: { width: "10%", fontSize: 7, textAlign: "right" },
  colCosto: { width: "10%", fontSize: 7, textAlign: "right" },
  colVenta: { width: "10%", fontSize: 7, textAlign: "right" },
  colStatus: { width: "10%", fontSize: 7 },
  headerCol: { color: "white", fontWeight: "bold", fontSize: 7 },
});
