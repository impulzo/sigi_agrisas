import type { PricingSettingsRepository, UpdatePricingSettingsData } from "../ports/PricingSettingsRepository";
import type { PricingSettings } from "../../domain/entities/PricingSettings";

export class UpdatePricingSettingsUseCase {
  constructor(private readonly repo: PricingSettingsRepository) {}

  async execute(data: UpdatePricingSettingsData): Promise<PricingSettings> {
    return this.repo.update(data);
  }
}
