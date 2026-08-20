export interface InventoryNotificationSettings {
  expirationNotificationEmail: string | null;
}

export const DEFAULT_INVENTORY_NOTIFICATION_SETTINGS: InventoryNotificationSettings = {
  expirationNotificationEmail: null,
};
