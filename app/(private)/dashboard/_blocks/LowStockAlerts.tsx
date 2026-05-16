import { Card } from "../../../_components/molecules/Card/Card";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import { cn } from "../../../_lib/cn";
import type { LowStockAlert, AlertSeverity } from "../_logic/types/domain";

interface LowStockAlertsProps {
  alerts: LowStockAlert[];
}

const itemClasses: Record<AlertSeverity, { row: string; icon: string; cta: string }> = {
  critical: {
    row: "bg-error-container/30 border border-error/10",
    icon: "bg-error-container text-on-error-container",
    cta: "text-error",
  },
  warning: {
    row: "bg-surface-container",
    icon: "bg-secondary-container text-on-secondary-container",
    cta: "text-primary",
  },
  info: {
    row: "bg-surface-container opacity-75",
    icon: "bg-tertiary-fixed text-on-tertiary-fixed",
    cta: "text-primary",
  },
};

export function LowStockAlerts({ alerts }: LowStockAlertsProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-lg">
        <h4 className="text-title-md text-on-surface">Low Stock Alerts</h4>
        <Icon name="warning" className="text-error" />
      </div>
      {alerts.length === 0 ? (
        <p className="text-on-surface-variant text-body-md text-center py-md">
          Sin alertas activas
        </p>
      ) : (
        <div className="space-y-md">
          {alerts.map((alert) => {
            const styles = itemClasses[alert.severity];
            return (
              <div
                key={alert.id}
                className={cn(
                  "flex items-center gap-md p-md rounded-lg",
                  styles.row,
                )}
              >
                <div
                  className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    styles.icon,
                  )}
                >
                  <Icon name={alert.icon} />
                </div>
                <div className="flex-1">
                  <p className="text-title-md text-on-surface">{alert.productName}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {alert.message}
                  </p>
                </div>
                <button
                  type="button"
                  className={cn(
                    "text-label-lg hover:underline bg-transparent",
                    styles.cta,
                  )}
                >
                  Restock
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
