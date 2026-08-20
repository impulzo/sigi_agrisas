import type { InventoryLotRepository } from "../ports/InventoryLotRepository";
import type { InventoryNotificationSettingsPort } from "../ports/InventoryNotificationSettingsPort";
import {
  InventoryLotExpiryNotificationPolicy,
  type ExpiryNotificationThreshold,
  type LotExpiryNotification,
} from "../../domain/services/InventoryLotExpiryNotificationPolicy";
import type { AdminNotificationService } from "@/shared/application/services/AdminNotificationService";

export class SendInventoryExpiryNotificationsUseCase {
  constructor(
    private readonly lotRepo: InventoryLotRepository,
    private readonly settingsPort: InventoryNotificationSettingsPort,
    private readonly notifier: AdminNotificationService
  ) {}

  async execute(referenceDate: Date = new Date()): Promise<void> {
    const to = await this.settingsPort.getExpirationNotificationEmail();
    if (!to) return;

    const pendingLots = await this.lotRepo.findPendingExpiryNotificationLots();
    if (pendingLots.length === 0) return;

    const notifications = InventoryLotExpiryNotificationPolicy.determineExpiryNotifications(
      pendingLots,
      referenceDate
    );
    if (notifications.length === 0) return;

    const grouped = new Map<ExpiryNotificationThreshold, LotExpiryNotification[]>();
    for (const notification of notifications) {
      const list = grouped.get(notification.threshold) ?? [];
      list.push(notification);
      grouped.set(notification.threshold, list);
    }

    for (const [threshold, items] of grouped) {
      await this.notifier.notifyInventoryExpiryDigest({
        to,
        threshold,
        items: items.map(({ lot }) => ({
          productName: lot.productName,
          branchName: lot.branchName,
          lotNumber: lot.lotNumber,
          quantity: lot.quantity,
          expirationDate: lot.expirationDate,
        })),
      });
      for (const { lot } of items) {
        await this.lotRepo.markLotNotified(lot.id, threshold);
      }
    }
  }
}
