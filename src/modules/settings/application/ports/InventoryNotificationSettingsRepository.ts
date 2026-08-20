import type { InventoryNotificationSettings } from "../../domain/entities/InventoryNotificationSettings";

export interface UpdateInventoryNotificationSettingsData {
  expirationNotificationEmail?: string | null;
}

export interface InventoryNotificationSettingsRepository {
  get(): Promise<InventoryNotificationSettings>;
  update(data: UpdateInventoryNotificationSettingsData): Promise<InventoryNotificationSettings>;
}
