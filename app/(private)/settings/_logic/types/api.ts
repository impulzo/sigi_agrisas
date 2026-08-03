export type PaperWidthDto = "58mm" | "80mm";

export interface TicketSettingsDto {
  logoUrl: string | null;
  headerText: string | null;
  footerText: string | null;
  paperWidth: PaperWidthDto;
}

export interface UpdateTicketSettingsBody {
  headerText?: string | null;
  footerText?: string | null;
  paperWidth?: PaperWidthDto;
}
