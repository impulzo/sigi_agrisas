export type PaperWidth = "58mm" | "80mm";

export interface TicketSettings {
  logoUrl: string | null;
  headerText: string | null;
  footerText: string | null;
  paperWidth: PaperWidth;
  businessAddress: string | null;
  businessPhone: string | null;
  businessTaxRegime: string | null;
  legendText: string | null;
}

export const DEFAULT_TICKET_SETTINGS: TicketSettings = {
  logoUrl: null,
  headerText: null,
  footerText: null,
  paperWidth: "80mm",
  businessAddress: "Ocotlán de Morelos, Oaxaca, C.P. 71520",
  businessPhone: "951 292 80 86",
  businessTaxRegime: "612 Personas Físicas con Actividad Empresarial",
  legendText: "Favor de revisar su mercancia. No se hacen cambios ni devoluciones. Gracias por su compra.",
};
