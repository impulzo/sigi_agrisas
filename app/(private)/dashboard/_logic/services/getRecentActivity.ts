import type { ActivityEvent } from "../types/domain";

const mockActivity: ActivityEvent[] = [
  {
    id: "evt-sale-9821",
    title: "New sale recorded",
    subject: "by Cashier 04",
    timestamp: "2 minutes ago",
    meta: "Invoice #AG-9821",
    isLatest: true,
  },
  {
    id: "evt-restock-corn",
    title: "Inventory restocked",
    subject: "- Corn Hybrid A",
    timestamp: "45 minutes ago",
    meta: "Warehouse B",
    isLatest: false,
  },
  {
    id: "evt-supplier-ecogrow",
    title: "New supplier registered",
    subject: "- EcoGrow Systems",
    timestamp: "3 hours ago",
    meta: "Verified by Admin",
    isLatest: false,
  },
];

export async function getRecentActivity(
  _fetchImpl?: typeof fetch,
): Promise<ActivityEvent[]> {
  return Promise.resolve(mockActivity);
}
