import { PrismaTicketSettingsRepository } from "@/modules/settings/infrastructure/repositories/PrismaTicketSettingsRepository";
import { DEFAULT_TICKET_SETTINGS } from "@/modules/settings/domain/entities/TicketSettings";
import type { PrismaClient } from "@prisma/client";

function makePrisma(upsertImpl: jest.Mock) {
  return {
    ticketSettings: { upsert: upsertImpl },
  } as unknown as PrismaClient;
}

function resolveLikeRow(args: {
  businessName?: string | null;
  businessRfc?: string | null;
  businessAddress?: string | null;
  businessPhone?: string | null;
  businessTaxRegime?: string | null;
  legendText?: string | null;
}) {
  return {
    logoUrl: null,
    footerText: null,
    paperWidth: "80mm",
    businessName: args.businessName ?? null,
    businessRfc: args.businessRfc ?? null,
    businessAddress: args.businessAddress ?? null,
    businessPhone: args.businessPhone ?? null,
    businessTaxRegime: args.businessTaxRegime ?? null,
    legendText: args.legendText ?? null,
  };
}

describe("PrismaTicketSettingsRepository", () => {
  it("first write defaults absent business fields to the business defaults", async () => {
    const upsert = jest.fn().mockResolvedValue(
      resolveLikeRow({
        businessName: DEFAULT_TICKET_SETTINGS.businessName,
        businessRfc: DEFAULT_TICKET_SETTINGS.businessRfc,
        businessAddress: DEFAULT_TICKET_SETTINGS.businessAddress,
        businessPhone: DEFAULT_TICKET_SETTINGS.businessPhone,
        businessTaxRegime: DEFAULT_TICKET_SETTINGS.businessTaxRegime,
        legendText: DEFAULT_TICKET_SETTINGS.legendText,
      })
    );
    const repo = new PrismaTicketSettingsRepository(makePrisma(upsert));

    await repo.update({ paperWidth: "58mm" });

    const create = upsert.mock.calls[0][0].create;
    expect(create.businessName).toBe(DEFAULT_TICKET_SETTINGS.businessName);
    expect(create.businessRfc).toBe(DEFAULT_TICKET_SETTINGS.businessRfc);
    expect(create.businessAddress).toBe(DEFAULT_TICKET_SETTINGS.businessAddress);
    expect(create.businessPhone).toBe(DEFAULT_TICKET_SETTINGS.businessPhone);
    expect(create.businessTaxRegime).toBe(DEFAULT_TICKET_SETTINGS.businessTaxRegime);
    expect(create.legendText).toBe(DEFAULT_TICKET_SETTINGS.legendText);
  });

  it("first write keeps an explicit null business field as null (not the default)", async () => {
    const upsert = jest.fn().mockResolvedValue(
      resolveLikeRow({
        businessAddress: null,
        businessPhone: DEFAULT_TICKET_SETTINGS.businessPhone,
        businessTaxRegime: DEFAULT_TICKET_SETTINGS.businessTaxRegime,
        legendText: DEFAULT_TICKET_SETTINGS.legendText,
      })
    );
    const repo = new PrismaTicketSettingsRepository(makePrisma(upsert));

    await repo.update({ businessAddress: null });

    const create = upsert.mock.calls[0][0].create;
    expect(create.businessAddress).toBeNull();
    expect(create.businessPhone).toBe(DEFAULT_TICKET_SETTINGS.businessPhone);
    expect(create.businessTaxRegime).toBe(DEFAULT_TICKET_SETTINGS.businessTaxRegime);
    expect(create.legendText).toBe(DEFAULT_TICKET_SETTINGS.legendText);
  });

  it("update branch keeps explicit null as null", async () => {
    const upsert = jest.fn().mockResolvedValue(
      resolveLikeRow({ businessPhone: null })
    );
    const repo = new PrismaTicketSettingsRepository(makePrisma(upsert));

    await repo.update({ businessPhone: null });

    const update = upsert.mock.calls[0][0].update;
    expect(update).toEqual({ businessPhone: null });
  });

  it("update branch includes businessName/businessRfc when provided", async () => {
    const upsert = jest.fn().mockResolvedValue(
      resolveLikeRow({ businessName: "Agrisas S.A. de C.V.", businessRfc: "AGR010101AB1" })
    );
    const repo = new PrismaTicketSettingsRepository(makePrisma(upsert));

    await repo.update({ businessName: "Agrisas S.A. de C.V.", businessRfc: "AGR010101AB1" });

    const update = upsert.mock.calls[0][0].update;
    expect(update).toEqual({ businessName: "Agrisas S.A. de C.V.", businessRfc: "AGR010101AB1" });
  });
});
