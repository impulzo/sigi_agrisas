export type ExpiryNotificationThreshold = "sixMonths" | "threeMonths" | "dayOf";

export interface InventoryLotExpirySnapshot {
  id: string;
  expirationDate: Date;
  notifiedSixMonthsAt: Date | null;
  notifiedThreeMonthsAt: Date | null;
  notifiedDayOfAt: Date | null;
  productName: string;
  branchName: string;
  lotNumber: string;
  quantity: number;
}

export interface LotExpiryNotification {
  lot: InventoryLotExpirySnapshot;
  threshold: ExpiryNotificationThreshold;
}

function utcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function utcMidnightPlusMonths(date: Date, months: number): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate());
}

export class InventoryLotExpiryNotificationPolicy {
  static determineExpiryNotifications(
    lots: InventoryLotExpirySnapshot[],
    referenceDate: Date
  ): LotExpiryNotification[] {
    const referenceMidnight = utcMidnight(referenceDate);
    const sixMonthsLimit = utcMidnightPlusMonths(referenceDate, 6);
    const threeMonthsLimit = utcMidnightPlusMonths(referenceDate, 3);

    const result: LotExpiryNotification[] = [];
    for (const lot of lots) {
      const expirationMidnight = utcMidnight(lot.expirationDate);

      if (lot.notifiedSixMonthsAt === null && expirationMidnight <= sixMonthsLimit) {
        result.push({ lot, threshold: "sixMonths" });
      }
      if (lot.notifiedThreeMonthsAt === null && expirationMidnight <= threeMonthsLimit) {
        result.push({ lot, threshold: "threeMonths" });
      }
      if (lot.notifiedDayOfAt === null && expirationMidnight <= referenceMidnight) {
        result.push({ lot, threshold: "dayOf" });
      }
    }
    return result;
  }
}
