import { PDF_COLORS } from "./pdfTheme";

/** Fragmentos compartidos entre payments/pdfStyles.ts e inventory/pdfStyles.ts —
 * confirmados idénticos (diff literal) antes de fusionarse aquí. */
export const simpleListPdfStyles = {
  page: { padding: 30, fontFamily: "Helvetica", fontSize: 10 },
  title: { fontSize: 18, fontWeight: "bold" as const, marginBottom: 4 },
  subtitle: { fontSize: 10, color: PDF_COLORS.onSurfaceVariant, marginBottom: 16 },
  table: { marginTop: 8 },
  tableHeader: {
    flexDirection: "row" as const,
    backgroundColor: PDF_COLORS.tertiary,
    color: "white",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row" as const,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.outlineVariant,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRowEven: { backgroundColor: PDF_COLORS.surfaceContainerLow },
  footer: {
    position: "absolute" as const,
    bottom: 20,
    left: 30,
    right: 30,
    fontSize: 8,
    color: PDF_COLORS.onSurfaceVariant,
    textAlign: "center" as const,
  },
  emptyMsg: { marginTop: 40, textAlign: "center" as const, color: PDF_COLORS.onSurfaceVariant, fontSize: 12 },
};
