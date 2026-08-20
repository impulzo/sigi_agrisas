import type { InventoryNotificationSettingsRepository } from "../ports/InventoryNotificationSettingsRepository";
import type { InventoryNotificationSettings } from "../../domain/entities/InventoryNotificationSettings";

export class GetInventoryNotificationSettingsUseCase {
  constructor(private readonly repo: InventoryNotificationSettingsRepository) {}

  async execute(): Promise<InventoryNotificationSettings> {
    return this.repo.get();
  }
}
