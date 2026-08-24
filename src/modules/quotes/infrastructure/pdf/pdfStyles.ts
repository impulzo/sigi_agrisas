import { StyleSheet } from "@react-pdf/renderer";
import { pdfBaseStyles } from "@/shared/infrastructure/pdf/pdfBaseStyles";
import { PDF_COLORS } from "@/shared/infrastructure/pdf/pdfTheme";

export const pdfStyles = StyleSheet.create({
  ...pdfBaseStyles,
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.outlineVariant,
  },
  logo: {
    width: 48,
    height: 48,
    objectFit: "contain",
  },
  issuerRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  issuerBlock: {
    flexDirection: "column",
    gap: 2,
  },
  issuerName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  issuerMeta: {
    fontSize: 8,
    color: PDF_COLORS.onSurfaceVariant,
  },
  quoteMeta: {
    textAlign: "right",
  },
  quoteMetaLabel: {
    fontSize: 8,
    color: PDF_COLORS.onSurfaceVariant,
  },
  quoteMetaValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  quoteMetaStatus: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    backgroundColor: PDF_COLORS.surfaceContainer,
    padding: "3 6",
    marginBottom: 4,
  },
  customerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  customerField: {
    width: "48%",
  },
  customerLabel: {
    fontSize: 7,
    color: PDF_COLORS.onSurfaceVariant,
  },
  customerValue: {
    fontSize: 9,
  },
  colDescription: { flex: 3, fontSize: 8 },
  colQty: { flex: 1, fontSize: 8, textAlign: "right" },
  colPrice: { flex: 1, fontSize: 8, textAlign: "right" },
  colDiscount: { flex: 1, fontSize: 8, textAlign: "right" },
  colTax: { flex: 1, fontSize: 8, textAlign: "right" },
  colTotal: { flex: 1, fontSize: 8, textAlign: "right" },
  totalsBox: {
    ...pdfBaseStyles.totalsBand,
    marginTop: 8,
    alignSelf: "flex-end",
    width: 220,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  totalsLabel: {
    fontSize: 8,
  },
  totalsValue: {
    fontSize: 8,
    textAlign: "right",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.outline,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  grandTotalValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  notesSection: {
    marginTop: 12,
  },
  notesLabel: {
    fontSize: 7,
    color: PDF_COLORS.onSurfaceVariant,
    marginBottom: 2,
  },
  notesValue: {
    fontSize: 8,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 7,
    color: PDF_COLORS.onSurfaceVariant,
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.outlineVariant,
    paddingTop: 4,
  },
});
