import type { LowStockAlert } from "../types/domain";

const mockAlerts: LowStockAlert[] = [
  {
    id: "alert-wheat-seeds",
    productName: "Wheat Seeds (Organic)",
    message: "Only 5 bags remaining",
    severity: "critical",
    icon: "grain",
  },
  {
    id: "alert-npk-15",
    productName: "NPK 15-15-15",
    message: "Below 15% threshold",
    severity: "warning",
    icon: "science",
  },
  {
    id: "alert-biopesticide",
    productName: "Bio-Pesticide G1",
    message: "12 units remaining",
    severity: "info",
    icon: "energy_savings_leaf",
  },
];

export async function getLowStockAlerts(
  _fetchImpl?: typeof fetch,
): Promise<LowStockAlert[]> {
  return Promise.resolve(mockAlerts);
}
