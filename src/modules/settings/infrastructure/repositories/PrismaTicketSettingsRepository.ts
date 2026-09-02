import { PrismaClient } from "@prisma/client";
import type { TicketSettingsRepository, UpdateTicketSettingsData } from "../../application/ports/TicketSettingsRepository";
import { DEFAULT_TICKET_SETTINGS, type TicketSettings, type PaperWidth } from "../../domain/entities/TicketSettings";

const SINGLETON_ID = "ticket-settings-singleton";

type Row = {
  logoUrl: string | null;
  footerText: string | null;
  paperWidth: string;
  businessName: string | null;
  businessRfc: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  businessTaxRegime: string | null;
  businessZipCode: string | null;
  legendText: string | null;
};

function toEntity(row: Row): TicketSettings {
  return {
    logoUrl: row.logoUrl,
    footerText: row.footerText,
    paperWidth: row.paperWidth as PaperWidth,
    businessName: row.businessName,
    businessRfc: row.businessRfc,
    businessAddress: row.businessAddress,
    businessPhone: row.businessPhone,
    businessEmail: row.businessEmail,
    businessTaxRegime: row.businessTaxRegime,
    businessZipCode: row.businessZipCode,
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
        footerText: data.footerText !== undefined ? data.footerText : DEFAULT_TICKET_SETTINGS.footerText,
        paperWidth: data.paperWidth !== undefined ? data.paperWidth : DEFAULT_TICKET_SETTINGS.paperWidth,
        businessName: data.businessName !== undefined ? data.businessName : DEFAULT_TICKET_SETTINGS.businessName,
        businessRfc: data.businessRfc !== undefined ? data.businessRfc : DEFAULT_TICKET_SETTINGS.businessRfc,
        businessAddress: data.businessAddress !== undefined ? data.businessAddress : DEFAULT_TICKET_SETTINGS.businessAddress,
        businessPhone: data.businessPhone !== undefined ? data.businessPhone : DEFAULT_TICKET_SETTINGS.businessPhone,
        businessEmail: data.businessEmail !== undefined ? data.businessEmail : DEFAULT_TICKET_SETTINGS.businessEmail,
        businessTaxRegime: data.businessTaxRegime !== undefined ? data.businessTaxRegime : DEFAULT_TICKET_SETTINGS.businessTaxRegime,
        businessZipCode: data.businessZipCode !== undefined ? data.businessZipCode : DEFAULT_TICKET_SETTINGS.businessZipCode,
        legendText: data.legendText !== undefined ? data.legendText : DEFAULT_TICKET_SETTINGS.legendText,
      },
      update: {
        ...(data.footerText !== undefined ? { footerText: data.footerText } : {}),
        ...(data.paperWidth !== undefined ? { paperWidth: data.paperWidth } : {}),
        ...(data.businessName !== undefined ? { businessName: data.businessName } : {}),
        ...(data.businessRfc !== undefined ? { businessRfc: data.businessRfc } : {}),
        ...(data.businessAddress !== undefined ? { businessAddress: data.businessAddress } : {}),
        ...(data.businessPhone !== undefined ? { businessPhone: data.businessPhone } : {}),
        ...(data.businessEmail !== undefined ? { businessEmail: data.businessEmail } : {}),
        ...(data.businessTaxRegime !== undefined ? { businessTaxRegime: data.businessTaxRegime } : {}),
        ...(data.businessZipCode !== undefined ? { businessZipCode: data.businessZipCode } : {}),
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
        footerText: DEFAULT_TICKET_SETTINGS.footerText,
        paperWidth: DEFAULT_TICKET_SETTINGS.paperWidth,
        businessName: DEFAULT_TICKET_SETTINGS.businessName,
        businessRfc: DEFAULT_TICKET_SETTINGS.businessRfc,
        businessAddress: DEFAULT_TICKET_SETTINGS.businessAddress,
        businessPhone: DEFAULT_TICKET_SETTINGS.businessPhone,
        businessEmail: DEFAULT_TICKET_SETTINGS.businessEmail,
        businessTaxRegime: DEFAULT_TICKET_SETTINGS.businessTaxRegime,
        businessZipCode: DEFAULT_TICKET_SETTINGS.businessZipCode,
        legendText: DEFAULT_TICKET_SETTINGS.legendText,
      },
      update: { logoUrl },
    });
    return toEntity(row);
  }
}
