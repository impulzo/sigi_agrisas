import type { TicketSettingsRepository, UpdateTicketSettingsData } from "../../application/ports/TicketSettingsRepository";
import { DEFAULT_TICKET_SETTINGS, type TicketSettings } from "../../domain/entities/TicketSettings";

export class InMemoryTicketSettingsRepository implements TicketSettingsRepository {
  private row: TicketSettings | null = null;

  async get(): Promise<TicketSettings> {
    return this.row ?? DEFAULT_TICKET_SETTINGS;
  }

  async update(data: UpdateTicketSettingsData): Promise<TicketSettings> {
    const base = this.row ?? DEFAULT_TICKET_SETTINGS;
    this.row = {
      ...base,
      ...(data.headerText !== undefined ? { headerText: data.headerText } : {}),
      ...(data.footerText !== undefined ? { footerText: data.footerText } : {}),
      ...(data.paperWidth !== undefined ? { paperWidth: data.paperWidth } : {}),
      ...(data.businessAddress !== undefined ? { businessAddress: data.businessAddress } : {}),
      ...(data.businessPhone !== undefined ? { businessPhone: data.businessPhone } : {}),
      ...(data.businessTaxRegime !== undefined ? { businessTaxRegime: data.businessTaxRegime } : {}),
      ...(data.legendText !== undefined ? { legendText: data.legendText } : {}),
    };
    return this.row;
  }

  async updateLogoUrl(logoUrl: string | null): Promise<TicketSettings> {
    const base = this.row ?? DEFAULT_TICKET_SETTINGS;
    this.row = { ...base, logoUrl };
    return this.row;
  }
}
