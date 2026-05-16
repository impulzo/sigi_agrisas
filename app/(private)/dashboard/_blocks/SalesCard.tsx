import { Card } from "../../../_components/molecules/Card/Card";
import { Chip } from "../../../_components/atoms/Chip/Chip";
import type { SalesKpi } from "../_logic/types/domain";

interface SalesCardProps {
  data: SalesKpi;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function opacityFromIndex(index: number, length: number): string {
  const step = Math.round(((index + 1) / length) * 100);
  if (step >= 95) return "bg-primary";
  if (step >= 80) return "bg-primary/60";
  if (step >= 65) return "bg-primary/50";
  if (step >= 50) return "bg-primary/40";
  if (step >= 35) return "bg-primary/30";
  return "bg-primary/20";
}

export function SalesCard({ data }: SalesCardProps) {
  const max = Math.max(...data.sparkline, 1);

  return (
    <Card className="min-h-[320px] flex flex-col justify-between p-xl">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-title-md text-on-surface-variant">Total Sales Today</p>
          <h3 className="text-display-lg text-on-surface mt-sm">
            {currencyFormatter.format(data.totalToday)}
          </h3>
        </div>
        <Chip
          label={data.trend.delta}
          tone="primary"
          icon={data.trend.direction === "up" ? "trending_up" : "trending_down"}
        />
      </div>
      <div className="w-full h-32 mt-md flex items-end gap-1" aria-hidden="true">
        {data.sparkline.map((value, idx) => {
          const heightPct = Math.max(5, Math.round((value / max) * 100));
          return (
            <div
              key={idx}
              className={`${opacityFromIndex(idx, data.sparkline.length)} w-full rounded-t-sm`}
              style={{ height: `${heightPct}%` }}
            />
          );
        })}
      </div>
    </Card>
  );
}
