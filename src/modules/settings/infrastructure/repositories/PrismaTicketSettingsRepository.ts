import { PrismaClient } from "@prisma/client";
import type { TicketSettingsRepository, UpdateTicketSettingsData } from "../../application/ports/TicketSettingsRepository";
import { DEFAULT_TICKET_SETTINGS, type TicketSettings, type PaperWidth } from "../../domain/entities/TicketSettings";

const SINGLETON_ID = "ticket-settings-singleton";

type Row = {
  logoUrl: string | null;
  headerText: string | null;
  footerText: string | null;
  paperWidth: string;
  businessAddress: string | null;
  businessPhone: string | null;
  businessTaxRegime: string | null;
  legendText: string | null;
};

function toEntity(row: Row): TicketSettings {
  return {
    logoUrl: row.logoUrl,
    headerText: row.headerText,
    footerText: row.footerText,
    paperWidth: row.paperWidth as PaperWidth,
    businessAddress: row.businessAddress,
    businessPhone: row.businessPhone,
    businessTaxRegime: row.businessTaxRegime,
    legendText: row.legendText,
  };
}

export class PrismaTicketSettingsRepository implements TicketSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(): Promise<TicketSettings> {
    const row = await this.prisma.ticketSettings.findFirst();
    return row ? toEntity(row) : DEFAULT_TICKET_SETTINGS;
  }

  async update(data: UpdateTicketSettingsData): Promise<TicketSettings> {
    const row = await this.prisma.ticketSettings.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        headerText: data.headerText !== undefined ? data.headerText : DEFAULT_TICKET_SETTINGS.headerText,
        footerText: data.footerText !== undefined ? data.footerText : DEFAULT_TICKET_SETTINGS.footerText,
        paperWidth: data.paperWidth !== undefined ? data.paperWidth : DEFAULT_TICKET_SETTINGS.paperWidth,
        businessAddress: data.businessAddress !== undefined ? data.businessAddress : DEFAULT_TICKET_SETTINGS.businessAddress,
        businessPhone: data.businessPhone !== undefined ? data.businessPhone : DEFAULT_TICKET_SETTINGS.businessPhone,
        businessTaxRegime: data.businessTaxRegime !== undefined ? data.businessTaxRegime : DEFAULT_TICKET_SETTINGS.businessTaxRegime,
        legendText: data.legendText !== undefined ? data.legendText : DEFAULT_TICKET_SETTINGS.legendText,
      },
      update: {
        ...(data.headerText !== undefined ? { headerText: data.headerText } : {}),
        ...(data.footerText !== undefined ? { footerText: data.footerText } : {}),
        ...(data.paperWidth !== undefined ? { paperWidth: data.paperWidth } : {}),
        ...(data.businessAddress !== undefined ? { businessAddress: data.businessAddress } : {}),
        ...(data.businessPhone !== undefined ? { businessPhone: data.businessPhone } : {}),
        ...(data.businessTaxRegime !== undefined ? { businessTaxRegime: data.businessTaxRegime } : {}),
        ...(data.legendText !== undefined ? { legendText: data.legendText } : {}),
      },
    });
    return toEntity(row);
  }

  async updateLogoUrl(logoUrl: string | null): Promise<TicketSettings> {
    const row = await this.prisma.ticketSettings.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        logoUrl,
        headerText: DEFAULT_TICKET_SETTINGS.headerText,
        footerText: DEFAULT_TICKET_SETTINGS.footerText,
        paperWidth: DEFAULT_TICKET_SETTINGS.paperWidth,
        businessAddress: DEFAULT_TICKET_SETTINGS.businessAddress,
        businessPhone: DEFAULT_TICKET_SETTINGS.businessPhone,
        businessTaxRegime: DEFAULT_TICKET_SETTINGS.businessTaxRegime,
        legendText: DEFAULT_TICKET_SETTINGS.legendText,
      },
      update: { logoUrl },
    });
    return toEntity(row);
  }
}
