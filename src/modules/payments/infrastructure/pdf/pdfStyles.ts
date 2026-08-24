import { StyleSheet } from "@react-pdf/renderer";
import { simpleListPdfStyles } from "@/shared/infrastructure/pdf/simpleListPdfStyles";
import { PDF_COLORS } from "@/shared/infrastructure/pdf/pdfTheme";

export const styles = StyleSheet.create({
  ...simpleListPdfStyles,
  issuerRow: { flexDirection: "row", gap: 6, alignItems: "flex-start", marginBottom: 4 },
  issuerBlock: { flexDirection: "column", gap: 1 },
  issuerName: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  issuerMeta: { fontSize: 7, color: PDF_COLORS.onSurfaceVariant },
  filtersSection: { marginBottom: 12 },
  filtersTitle: { fontSize: 9, fontWeight: "bold", marginBottom: 4, color: PDF_COLORS.onSurfaceVariant },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  chip: { backgroundColor: "#e8f4fd", borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, fontSize: 8 },
  colDate: { width: "12%", fontSize: 8 },
  colRecibo: { width: "12%", fontSize: 8 },
  colTicket: { width: "12%", fontSize: 8 },
  colCliente: { width: "15%", fontSize: 8 },
  colCobrador: { width: "15%", fontSize: 8 },
  colMetodo: { width: "10%", fontSize: 8 },
  colMonto: { width: "12%", fontSize: 8, textAlign: "right" },
  colEstado: { width: "12%", fontSize: 8 },
  totalsSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: PDF_COLORS.outline, paddingTop: 8 },
  totalsTitle: { fontSize: 11, fontWeight: "bold", marginBottom: 6 },
  totalsRow: { flexDirection: "row", marginBottom: 3 },
  totalsLabel: { width: 160, fontSize: 9, color: PDF_COLORS.onSurfaceVariant },
  totalsValue: { fontSize: 9, fontWeight: "bold" },
  headerCol: { color: "white", fontWeight: "bold", fontSize: 8 },
  ticketHeader: {
    flexDirection: "row",
    backgroundColor: "#eef3fb",
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginTop: 8,
    fontSize: 9,
    fontWeight: "bold",
    gap: 12,
  },
});
