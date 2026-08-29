import type { TicketSettings } from "../../domain/entities/TicketSettings";

export interface UpdateTicketSettingsData {
  footerText?: string | null;
  paperWidth?: "58mm" | "80mm";
  businessName?: string | null;
  businessRfc?: string | null;
  businessAddress?: string | null;
  businessPhone?: string | null;
  businessTaxRegime?: string | null;
  businessZipCode?: string | null;
  legendText?: string | null;
}

export interface TicketSettingsRepository {
  get(): Promise<TicketSettings>;
  update(data: UpdateTicketSettingsData): Promise<TicketSettings>;
  updateLogoUrl(logoUrl: string | null): Promise<TicketSettings>;
}
