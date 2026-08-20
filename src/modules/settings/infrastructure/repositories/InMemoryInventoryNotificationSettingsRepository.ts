import type {
  InventoryNotificationSettingsRepository,
  UpdateInventoryNotificationSettingsData,
} from "../../application/ports/InventoryNotificationSettingsRepository";
import {
  DEFAULT_INVENTORY_NOTIFICATION_SETTINGS,
  type InventoryNotificationSettings,
} from "../../domain/entities/InventoryNotificationSettings";

export class InMemoryInventoryNotificationSettingsRepository implements InventoryNotificationSettingsRepository {
  private row: InventoryNotificationSettings | null = null;

  async get(): Promise<InventoryNotificationSettings> {
    return this.row ?? DEFAULT_INVENTORY_NOTIFICATION_SETTINGS;
  }

  async update(data: UpdateInventoryNotificationSettingsData): Promise<InventoryNotificationSettings> {
    const base = this.row ?? DEFAULT_INVENTORY_NOTIFICATION_SETTINGS;
    this.row = {
      ...base,
      ...(data.expirationNotificationEmail !== undefined
        ? { expirationNotificationEmail: data.expirationNotificationEmail }
        : {}),
    };
    return this.row;
  }
}
