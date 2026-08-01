import { PrismaClient } from "@prisma/client";
import type { TicketSettingsRepository, UpdateTicketSettingsData } from "../../application/ports/TicketSettingsRepository";
import { DEFAULT_TICKET_SETTINGS, type TicketSettings, type PaperWidth } from "../../domain/entities/TicketSettings";

const SINGLETON_ID = "ticket-settings-singleton";

function toEntity(row: { logoUrl: string | null; headerText: string | null; footerText: string | null; paperWidth: string }): TicketSettings {
  return {
    logoUrl: row.logoUrl,
    headerText: row.headerText,
    footerText: row.footerText,
    paperWidth: row.paperWidth as PaperWidth,
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
        headerText: data.headerText ?? null,
        footerText: data.footerText ?? null,
        paperWidth: data.paperWidth ?? "80mm",
      },
      update: {
        ...(data.headerText !== undefined ? { headerText: data.headerText } : {}),
        ...(data.footerText !== undefined ? { footerText: data.footerText } : {}),
        ...(data.paperWidth !== undefined ? { paperWidth: data.paperWidth } : {}),
      },
    });
    return toEntity(row);
  }

  async updateLogoUrl(logoUrl: string | null): Promise<TicketSettings> {
    const row = await this.prisma.ticketSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, logoUrl },
      update: { logoUrl },
    });
    return toEntity(row);
  }
}
