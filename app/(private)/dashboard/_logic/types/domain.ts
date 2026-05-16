import type { IconName } from "../../../../_components/atoms/Icon/icons";

export interface SalesKpi {
  totalToday: number;
  trend: {
    delta: string;
    direction: "up" | "down";
  };
  sparkline: number[];
}

export interface InventoryCategory {
  name: string;
  quantity: string;
  percent: number;
}

export interface InventorySummary {
  totalItems: number;
  categories: InventoryCategory[];
}

export interface DashboardKpis {
  salesToday: SalesKpi;
  inventory: InventorySummary;
}

export type AlertSeverity = "critical" | "warning" | "info";

export interface LowStockAlert {
  id: string;
  productName: string;
  message: string;
  severity: AlertSeverity;
  icon: IconName;
}

export interface ActivityEvent {
  id: string;
  title: string;
  subject: string;
  timestamp: string;
  meta: string;
  isLatest: boolean;
}

export type HubStatus = "operational" | "degraded" | "down";

export interface LogisticsHub {
  hubName: string;
  status: HubStatus;
  mapImageSrc: string;
}
