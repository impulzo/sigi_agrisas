import type { PricingSettingsRepository } from "../ports/PricingSettingsRepository";
import type { PricingSettings } from "../../domain/entities/PricingSettings";

export class GetPricingSettingsUseCase {
  constructor(private readonly repo: PricingSettingsRepository) {}

  async execute(): Promise<PricingSettings> {
    return this.repo.get();
  }
}
