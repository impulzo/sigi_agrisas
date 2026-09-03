export type PaperWidth = "58mm" | "80mm";

export interface TicketSettings {
  logoUrl: string | null;
  footerText: string | null;
  paperWidth: PaperWidth;
  businessName: string | null;
  businessRfc: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  businessTaxRegime: string | null;
  businessZipCode: string | null;
  legendText: string | null;
}

export const DEFAULT_TICKET_SETTINGS: TicketSettings = {
  logoUrl: null,
  footerText: null,
  paperWidth: "80mm",
  businessName: null,
  businessRfc: null,
  businessAddress: null,
  businessPhone: null,
  businessEmail: null,
  businessTaxRegime: null,
  businessZipCode: null,
  legendText: "Favor de revisar su mercancia. No se hacen cambios ni devoluciones. Gracias por su compra.",
};
