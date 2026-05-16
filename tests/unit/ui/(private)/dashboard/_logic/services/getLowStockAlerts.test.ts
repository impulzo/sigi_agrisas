import { getLowStockAlerts } from "../../../../../../../app/(private)/dashboard/_logic/services/getLowStockAlerts";

describe("getLowStockAlerts", () => {
  it("resolves with at least 3 alerts of mixed severity", async () => {
    const alerts = await getLowStockAlerts();
    expect(alerts.length).toBeGreaterThanOrEqual(3);
    const severities = alerts.map((a) => a.severity);
    expect(severities).toContain("critical");
    expect(severities).toContain("warning");
    expect(severities).toContain("info");
  });

  it("each alert has the required fields", async () => {
    const alerts = await getLowStockAlerts();
    for (const a of alerts) {
      expect(a.id).toBeTruthy();
      expect(a.productName).toBeTruthy();
      expect(a.message).toBeTruthy();
      expect(a.icon).toBeTruthy();
    }
  });

  it("accepts an optional fetchImpl without throwing", async () => {
    await expect(
      getLowStockAlerts(jest.fn() as unknown as typeof fetch),
    ).resolves.toHaveLength(3);
  });
});
