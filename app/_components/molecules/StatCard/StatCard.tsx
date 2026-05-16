import { cn } from "../../../_lib/cn";
import { Icon } from "../../atoms/Icon/Icon";
import type { IconName } from "../../atoms/Icon/icons";
import { Chip } from "../../atoms/Chip/Chip";
import { Card } from "../Card/Card";

interface Trend {
  delta: string;
  direction: "up" | "down";
}

interface StatCardProps {
  label: string;
  value: string;
  trend?: Trend;
  icon?: IconName;
  className?: string;
}

export function StatCard({ label, value, trend, icon, className }: StatCardProps) {
  return (
    <Card className={cn("flex flex-col gap-md", className)}>
      <div className="flex items-start justify-between">
        <div>
          {icon && <Icon name={icon} className="text-4xl text-primary mb-sm" />}
          <p className="text-title-md text-on-surface-variant">{label}</p>
          <h3 className="text-display-lg text-on-surface mt-sm">{value}</h3>
        </div>
        {trend && (
          <Chip
            label={trend.delta}
            tone="primary"
            icon={trend.direction === "up" ? "trending_up" : "trending_down"}
          />
        )}
      </div>
    </Card>
  );
}
