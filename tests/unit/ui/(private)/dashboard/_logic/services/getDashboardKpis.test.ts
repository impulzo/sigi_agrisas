import { getDashboardKpis } from "../../../../../../../app/(private)/dashboard/_logic/services/getDashboardKpis";

describe("getDashboardKpis", () => {
  it("resolves with mock KPI shape", async () => {
    const kpis = await getDashboardKpis();
    expect(kpis.salesToday.totalToday).toBe(24850);
    expect(kpis.salesToday.trend.direction).toBe("up");
    expect(kpis.salesToday.sparkline).toHaveLength(8);
    expect(kpis.inventory.totalItems).toBe(1240);
    expect(kpis.inventory.categories.length).toBeGreaterThanOrEqual(2);
  });

  it("accepts an optional fetchImpl without throwing", async () => {
    const fakeFetch = jest.fn();
    await expect(
      getDashboardKpis(fakeFetch as unknown as typeof fetch),
    ).resolves.toBeDefined();
  });
});
