import { PrismaClient } from "@prisma/client";
import type {
  InventoryNotificationSettingsRepository,
  UpdateInventoryNotificationSettingsData,
} from "../../application/ports/InventoryNotificationSettingsRepository";
import {
  DEFAULT_INVENTORY_NOTIFICATION_SETTINGS,
  type InventoryNotificationSettings,
} from "../../domain/entities/InventoryNotificationSettings";

const SINGLETON_ID = "inventory-notification-settings-singleton";

function toEntity(row: { expirationNotificationEmail: string | null }): InventoryNotificationSettings {
  return { expirationNotificationEmail: row.expirationNotificationEmail };
}

export class PrismaInventoryNotificationSettingsRepository implements InventoryNotificationSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(): Promise<InventoryNotificationSettings> {
    const row = await this.prisma.inventoryNotificationSettings.findFirst();
    return row ? toEntity(row) : DEFAULT_INVENTORY_NOTIFICATION_SETTINGS;
  }

  async update(data: UpdateInventoryNotificationSettingsData): Promise<InventoryNotificationSettings> {
    const row = await this.prisma.inventoryNotificationSettings.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        expirationNotificationEmail:
          data.expirationNotificationEmail ?? DEFAULT_INVENTORY_NOTIFICATION_SETTINGS.expirationNotificationEmail,
      },
      update: {
        ...(data.expirationNotificationEmail !== undefined
          ? { expirationNotificationEmail: data.expirationNotificationEmail }
          : {}),
      },
    });
    return toEntity(row);
  }
}
