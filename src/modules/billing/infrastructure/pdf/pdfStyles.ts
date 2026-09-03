import { StyleSheet } from "@react-pdf/renderer";
import { pdfBaseStyles } from "@/shared/infrastructure/pdf/pdfBaseStyles";
import { PDF_COLORS } from "@/shared/infrastructure/pdf/pdfTheme";

export const pdfStyles = StyleSheet.create({
  ...pdfBaseStyles,
  watermarkDiagonal: {
    position: "absolute",
    top: "42%",
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 28,
    color: PDF_COLORS.outlineVariant,
    opacity: 0.3,
    transform: "rotate(-45deg)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.outlineVariant,
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
  invoiceMetaColumns: {
    flexDirection: "row",
    gap: 16,
  },
  invoiceMetaCol: {
    flexDirection: "column",
    gap: 2,
    textAlign: "right",
  },
  invoiceMetaLabel: {
    fontSize: 8,
    color: PDF_COLORS.onSurfaceVariant,
  },
  invoiceMetaValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
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
  receiverGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  receiverField: {
    width: "48%",
  },
  receiverLabel: {
    fontSize: 7,
    color: PDF_COLORS.onSurfaceVariant,
  },
  receiverValue: {
    fontSize: 9,
  },
  colDescription: { flex: 3, fontSize: 8 },
  colDescriptionMeta: { fontSize: 6, color: PDF_COLORS.onSurfaceVariant, marginTop: 1 },
  colQty: { flex: 0.6, fontSize: 8, textAlign: "right" },
  colPrice: { flex: 1, fontSize: 8, textAlign: "right" },
  colDiscount: { flex: 0.7, fontSize: 8, textAlign: "right" },
  colTax: { flex: 0.7, fontSize: 8, textAlign: "right" },
  colTotal: { flex: 1, fontSize: 8, textAlign: "right" },
  taxBreakdown: {
    marginTop: 8,
    alignSelf: "flex-end",
    width: 220,
  },
  totalsBox: {
    ...pdfBaseStyles.totalsBand,
    marginTop: 4,
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
  fiscalFooter: {
    marginTop: 20,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.outlineVariant,
  },
  fiscalFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  fiscalFooterLabel: {
    fontSize: 7,
    color: PDF_COLORS.onSurfaceVariant,
    width: 80,
  },
  fiscalFooterValue: {
    fontSize: 7,
    fontFamily: "Courier",
    flex: 1,
  },
  qrPlaceholder: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: PDF_COLORS.outline,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  qrPlaceholderText: {
    fontSize: 6,
    color: PDF_COLORS.outline,
    textAlign: "center",
  },
});
