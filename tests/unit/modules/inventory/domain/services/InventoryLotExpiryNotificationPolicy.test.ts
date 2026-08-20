import {
  InventoryLotExpiryNotificationPolicy,
  type InventoryLotExpirySnapshot,
} from "@/modules/inventory/domain/services/InventoryLotExpiryNotificationPolicy";

const REFERENCE_DATE = new Date("2026-08-14T00:00:00.000Z");

function baseLot(overrides: Partial<InventoryLotExpirySnapshot>): InventoryLotExpirySnapshot {
  return {
    id: "lot-1",
    expirationDate: new Date("2027-02-14T00:00:00.000Z"),
    notifiedSixMonthsAt: null,
    notifiedThreeMonthsAt: null,
    notifiedDayOfAt: null,
    productName: "PACKHARD 20 L",
    branchName: "Matriz",
    lotNumber: "L-001",
    quantity: 10,
    ...overrides,
  };
}

describe("InventoryLotExpiryNotificationPolicy", () => {
  it("triggers sixMonths when expiration is within 6 months and not yet notified", () => {
    const lot = baseLot({ expirationDate: new Date("2027-02-14T00:00:00.000Z") });

    const result = InventoryLotExpiryNotificationPolicy.determineExpiryNotifications([lot], REFERENCE_DATE);

    expect(result).toEqual([{ lot, threshold: "sixMonths" }]);
  });

  it("triggers threeMonths when expiration is within 3 months and not yet notified", () => {
    const lot = baseLot({
      expirationDate: new Date("2026-11-14T00:00:00.000Z"),
      notifiedSixMonthsAt: REFERENCE_DATE,
    });

    const result = InventoryLotExpiryNotificationPolicy.determineExpiryNotifications([lot], REFERENCE_DATE);

    expect(result).toEqual([{ lot, threshold: "threeMonths" }]);
  });

  it("triggers dayOf when expiration date has arrived and not yet notified", () => {
    const lot = baseLot({
      expirationDate: REFERENCE_DATE,
      notifiedSixMonthsAt: REFERENCE_DATE,
      notifiedThreeMonthsAt: REFERENCE_DATE,
    });

    const result = InventoryLotExpiryNotificationPolicy.determineExpiryNotifications([lot], REFERENCE_DATE);

    expect(result).toEqual([{ lot, threshold: "dayOf" }]);
  });

  it("does not repeat a threshold already notified", () => {
    const lot = baseLot({
      expirationDate: new Date("2027-02-14T00:00:00.000Z"),
      notifiedSixMonthsAt: REFERENCE_DATE,
    });

    const result = InventoryLotExpiryNotificationPolicy.determineExpiryNotifications([lot], REFERENCE_DATE);

    expect(result).toEqual([]);
  });

  it("triggers no thresholds when the lot is far from expiring", () => {
    const lot = baseLot({ expirationDate: new Date("2028-01-01T00:00:00.000Z") });

    const result = InventoryLotExpiryNotificationPolicy.determineExpiryNotifications([lot], REFERENCE_DATE);

    expect(result).toEqual([]);
  });

  it("catch-up: a lot that skipped evaluation triggers multiple thresholds at once", () => {
    const lot = baseLot({ expirationDate: new Date("2026-10-14T00:00:00.000Z") });

    const result = InventoryLotExpiryNotificationPolicy.determineExpiryNotifications([lot], REFERENCE_DATE);

    expect(result).toEqual([
      { lot, threshold: "sixMonths" },
      { lot, threshold: "threeMonths" },
    ]);
  });

  it("catch-up: an already-expired lot with no flags triggers all 3 thresholds", () => {
    const lot = baseLot({ expirationDate: new Date("2026-01-01T00:00:00.000Z") });

    const result = InventoryLotExpiryNotificationPolicy.determineExpiryNotifications([lot], REFERENCE_DATE);

    expect(result).toEqual([
      { lot, threshold: "sixMonths" },
      { lot, threshold: "threeMonths" },
      { lot, threshold: "dayOf" },
    ]);
  });
});
