import type { PricingSettings } from "../../domain/entities/PricingSettings";

export interface UpdatePricingSettingsData {
  dosificationSurchargePct?: number;
}

export interface PricingSettingsRepository {
  get(): Promise<PricingSettings>;
  update(data: UpdatePricingSettingsData): Promise<PricingSettings>;
}
