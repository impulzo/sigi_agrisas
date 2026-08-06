import { PrismaClient } from "@prisma/client";
import type { PricingSettingsRepository, UpdatePricingSettingsData } from "../../application/ports/PricingSettingsRepository";
import { DEFAULT_PRICING_SETTINGS, type PricingSettings } from "../../domain/entities/PricingSettings";

const SINGLETON_ID = "pricing-settings-singleton";

function toEntity(row: { dosificationSurchargePct: { toNumber(): number } | number }): PricingSettings {
  const raw = row.dosificationSurchargePct;
  return {
    dosificationSurchargePct: typeof raw === "number" ? raw : raw.toNumber(),
  };
}

export class PrismaPricingSettingsRepository implements PricingSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(): Promise<PricingSettings> {
    const row = await this.prisma.pricingSettings.findFirst();
    return row ? toEntity(row) : DEFAULT_PRICING_SETTINGS;
  }

  async update(data: UpdatePricingSettingsData): Promise<PricingSettings> {
    const row = await this.prisma.pricingSettings.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        dosificationSurchargePct: data.dosificationSurchargePct ?? DEFAULT_PRICING_SETTINGS.dosificationSurchargePct,
      },
      update: {
        ...(data.dosificationSurchargePct !== undefined ? { dosificationSurchargePct: data.dosificationSurchargePct } : {}),
      },
    });
    return toEntity(row);
  }
}
