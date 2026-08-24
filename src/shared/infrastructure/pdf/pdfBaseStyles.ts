import { PDF_COLORS } from "./pdfTheme";

/** Fragmentos de estilo compartidos entre módulos de PDF. Objeto plano (no StyleSheet.create)
 * para poder spreadearse dentro del StyleSheet.create de cada módulo:
 * `StyleSheet.create({...pdfBaseStyles, ...propioDelModulo})`. */
export const pdfBaseStyles = {
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 30,
    color: PDF_COLORS.onSurface,
  },
  tableHeader: {
    flexDirection: "row" as const,
    backgroundColor: PDF_COLORS.surfaceContainer,
    padding: "3 4",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row" as const,
    padding: "3 4",
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.outlineVariant,
  },
  tableRowAlt: {
    flexDirection: "row" as const,
    padding: "3 4",
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.outlineVariant,
    backgroundColor: PDF_COLORS.surfaceContainerLow,
  },
  totalsBand: {
    marginTop: 4,
    padding: "6 8",
    backgroundColor: PDF_COLORS.surfaceContainerHigh,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.outline,
  },
  footer: {
    position: "absolute" as const,
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    fontSize: 8,
    color: PDF_COLORS.onSurfaceVariant,
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.outlineVariant,
    paddingTop: 4,
  },
  badge: {
    fontSize: 7,
    color: PDF_COLORS.error,
    fontFamily: "Helvetica-Bold",
  },
};
