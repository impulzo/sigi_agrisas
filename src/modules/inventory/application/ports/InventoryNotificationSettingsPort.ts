export interface InventoryNotificationSettingsPort {
  getExpirationNotificationEmail(): Promise<string | null>;
}
