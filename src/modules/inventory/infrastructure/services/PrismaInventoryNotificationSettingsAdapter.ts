import { PrismaInventoryNotificationSettingsRepository } from "@/modules/settings/infrastructure/repositories/PrismaInventoryNotificationSettingsRepository";
import type { InventoryNotificationSettingsPort } from "../../application/ports/InventoryNotificationSettingsPort";

export class PrismaInventoryNotificationSettingsAdapter implements InventoryNotificationSettingsPort {
  constructor(
    private readonly repo: PrismaInventoryNotificationSettingsRepository
  ) {}

  async getExpirationNotificationEmail(): Promise<string | null> {
    const settings = await this.repo.get();
    return settings.expirationNotificationEmail;
  }
}
