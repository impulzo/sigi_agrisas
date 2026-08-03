export type PaperWidth = "58mm" | "80mm";

export interface TicketSettings {
  logoUrl: string | null;
  headerText: string | null;
  footerText: string | null;
  paperWidth: PaperWidth;
}

export const DEFAULT_TICKET_SETTINGS: TicketSettings = {
  logoUrl: null,
  headerText: null,
  footerText: null,
  paperWidth: "80mm",
};
