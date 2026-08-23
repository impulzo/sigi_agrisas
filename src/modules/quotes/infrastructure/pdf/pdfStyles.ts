import { StyleSheet } from "@react-pdf/renderer";

export const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 30,
    color: "#111",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
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
    color: "#555",
  },
  quoteMeta: {
    textAlign: "right",
  },
  quoteMetaLabel: {
    fontSize: 8,
    color: "#555",
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
    backgroundColor: "#f0f0f0",
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
    color: "#666",
  },
  customerValue: {
    fontSize: 9,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e0e0e0",
    padding: "3 4",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    padding: "3 4",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: "3 4",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
    backgroundColor: "#fafafa",
  },
  colDescription: { flex: 3, fontSize: 8 },
  colQty: { flex: 1, fontSize: 8, textAlign: "right" },
  colPrice: { flex: 1, fontSize: 8, textAlign: "right" },
  colDiscount: { flex: 1, fontSize: 8, textAlign: "right" },
  colTax: { flex: 1, fontSize: 8, textAlign: "right" },
  colTotal: { flex: 1, fontSize: 8, textAlign: "right" },
  totalsBox: {
    marginTop: 8,
    alignSelf: "flex-end",
    width: 220,
    padding: "6 8",
    backgroundColor: "#e8e8e8",
    borderTopWidth: 1,
    borderTopColor: "#999",
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
    borderTopColor: "#999",
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
    color: "#666",
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
    color: "#999",
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
    paddingTop: 4,
  },
});
