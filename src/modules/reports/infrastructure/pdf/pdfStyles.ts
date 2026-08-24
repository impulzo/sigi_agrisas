import { StyleSheet } from "@react-pdf/renderer";
import { pdfBaseStyles } from "@/shared/infrastructure/pdf/pdfBaseStyles";
import { PDF_COLORS } from "@/shared/infrastructure/pdf/pdfTheme";

export const pdfStyles = StyleSheet.create({
  ...pdfBaseStyles,
  header: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.outlineVariant,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  headerMeta: {
    fontSize: 8,
    color: PDF_COLORS.onSurfaceVariant,
  },
  issuerRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
    marginBottom: 4,
  },
  issuerBlock: {
    flexDirection: "column",
    gap: 1,
  },
  issuerName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  issuerMeta: {
    fontSize: 7,
    color: PDF_COLORS.onSurfaceVariant,
  },
  section: {
    marginBottom: 12,
  },
  branchTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    backgroundColor: PDF_COLORS.surfaceContainer,
    padding: "4 6",
    marginBottom: 4,
  },
  departmentTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginTop: 6,
    marginBottom: 2,
    paddingLeft: 4,
    color: PDF_COLORS.onSurfaceVariant,
  },
  cell: {
    flex: 1,
    fontSize: 8,
  },
  cellNarrow: {
    width: 50,
    fontSize: 8,
  },
  cellWide: {
    flex: 2,
    fontSize: 8,
  },
  subtotal: {
    flexDirection: "row",
    padding: "2 4",
    backgroundColor: PDF_COLORS.surfaceContainerLow,
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.outline,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  totals: {
    ...pdfBaseStyles.totalsBand,
    marginTop: 12,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  totalsRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  totalsLabel: {
    flex: 1,
  },
  totalsValue: {
    width: 80,
    textAlign: "right",
  },
  emptyMessage: {
    marginTop: 24,
    textAlign: "center",
    color: PDF_COLORS.onSurfaceVariant,
    fontSize: 11,
  },
  badge: {
    fontSize: 7,
    color: PDF_COLORS.error,
    fontFamily: "Helvetica-Bold",
  },

  // Anchos de columna específicos de CashCutReportPdf — plegados aquí desde su
  // StyleSheet.create local ("cols"); sin equivalente reusable en otros reportes.
  cashCutHeader: {
    flexDirection: "row",
    backgroundColor: PDF_COLORS.surfaceContainer,
    padding: "3 2",
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
  },
  cashCutRow: {
    flexDirection: "row",
    padding: "2 2",
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.outlineVariant,
    fontSize: 7,
  },
  cashCutRowAlt: {
    flexDirection: "row",
    padding: "2 2",
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.outlineVariant,
    backgroundColor: PDF_COLORS.surfaceContainerLow,
    fontSize: 7,
  },
  cashCutCte: { width: 35 },
  cashCutDocto: { width: 55 },
  cashCutFactura: { width: 55 },
  cashCutCliente: { width: 90 },
  cashCutFecFact: { width: 55 },
  cashCutDias: { width: 28, textAlign: "right" },
  cashCutImporte: { width: 55, textAlign: "right" },
  cashCutFp: { width: 60 },
  cashCutReferencia: { width: 90 },
  cashCutFCobro: { width: 55 },
  cashCutIva: { width: 45, textAlign: "right" },
  cashCutTasa: { width: 35, textAlign: "right" },
});
