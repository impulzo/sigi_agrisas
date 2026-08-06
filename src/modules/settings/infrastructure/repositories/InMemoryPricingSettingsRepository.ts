import type { PricingSettingsRepository, UpdatePricingSettingsData } from "../../application/ports/PricingSettingsRepository";
import { DEFAULT_PRICING_SETTINGS, type PricingSettings } from "../../domain/entities/PricingSettings";

export class InMemoryPricingSettingsRepository implements PricingSettingsRepository {
  private row: PricingSettings | null = null;

  async get(): Promise<PricingSettings> {
    return this.row ?? DEFAULT_PRICING_SETTINGS;
  }

  async update(data: UpdatePricingSettingsData): Promise<PricingSettings> {
    const base = this.row ?? DEFAULT_PRICING_SETTINGS;
    this.row = {
      ...base,
      ...(data.dosificationSurchargePct !== undefined ? { dosificationSurchargePct: data.dosificationSurchargePct } : {}),
    };
    return this.row;
  }
}
