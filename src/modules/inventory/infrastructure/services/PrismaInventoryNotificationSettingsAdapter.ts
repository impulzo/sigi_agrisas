import { PrismaClient } from "@prisma/client";
import { PrismaInventoryNotificationSettingsRepository } from "@/modules/settings/infrastructure/repositories/PrismaInventoryNotificationSettingsRepository";
import type { InventoryNotificationSettingsPort } from "../../application/ports/InventoryNotificationSettingsPort";

export class PrismaInventoryNotificationSettingsAdapter implements InventoryNotificationSettingsPort {
  private readonly repo: PrismaInventoryNotificationSettingsRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new PrismaInventoryNotificationSettingsRepository(prisma);
  }

  async getExpirationNotificationEmail(): Promise<string | null> {
    const settings = await this.repo.get();
    return settings.expirationNotificationEmail;
  }
}
