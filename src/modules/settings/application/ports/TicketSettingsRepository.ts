import type { TicketSettings } from "../../domain/entities/TicketSettings";

export interface UpdateTicketSettingsData {
  headerText?: string | null;
  footerText?: string | null;
  paperWidth?: "58mm" | "80mm";
  businessAddress?: string | null;
  businessPhone?: string | null;
  businessTaxRegime?: string | null;
  legendText?: string | null;
}

export interface TicketSettingsRepository {
  get(): Promise<TicketSettings>;
  update(data: UpdateTicketSettingsData): Promise<TicketSettings>;
  updateLogoUrl(logoUrl: string | null): Promise<TicketSettings>;
}
