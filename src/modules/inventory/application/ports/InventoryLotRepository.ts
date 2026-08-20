import type {
  ExpiryNotificationThreshold,
  InventoryLotExpirySnapshot,
} from "../../domain/services/InventoryLotExpiryNotificationPolicy";

export interface NearestExpirationLot {
  expirationDate: Date;
  lotNumber: string;
}

export interface InventoryLotRepository {
  findNearestExpirationByProducts(
    branchId: string,
    productIds: string[]
  ): Promise<Map<string, NearestExpirationLot>>;

  /** Lotes cuyo ciclo de notificación de caducidad no está completo (notifiedDayOfAt IS NULL). */
  findPendingExpiryNotificationLots(): Promise<InventoryLotExpirySnapshot[]>;

  markLotNotified(lotId: string, threshold: ExpiryNotificationThreshold): Promise<void>;
}
