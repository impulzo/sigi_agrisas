import type { DashboardKpis } from "../types/domain";

const mockKpis: DashboardKpis = {
  salesToday: {
    totalToday: 24850,
    trend: { delta: "+12.4%", direction: "up" },
    sparkline: [40, 55, 45, 65, 80, 70, 90, 100],
  },
  inventory: {
    totalItems: 1240,
    categories: [
      { name: "Seeds", quantity: "450kg", percent: 75 },
      { name: "Fertilizers", quantity: "790kg", percent: 50 },
    ],
  },
};

export async function getDashboardKpis(
  _fetchImpl?: typeof fetch,
): Promise<DashboardKpis> {
  return Promise.resolve(mockKpis);
}
