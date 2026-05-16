import { Card } from "../../../_components/molecules/Card/Card";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import type { InventorySummary } from "../_logic/types/domain";

interface InventoryCardProps {
  data: InventorySummary;
}

const numberFormatter = new Intl.NumberFormat("en-US");

export function InventoryCard({ data }: InventoryCardProps) {
  return (
    <Card tone="primary" className="flex flex-col justify-between">
      <div>
        <Icon name="agriculture" className="text-4xl mb-md" />
        <h4 className="text-title-md opacity-90">Inventory Status</h4>
        <p className="text-headline-lg mt-sm">
          {numberFormatter.format(data.totalItems)} Items
        </p>
      </div>
      <div className="mt-xl space-y-md">
        {data.categories.map((category) => (
          <div key={category.name}>
            <div className="flex justify-between text-label-lg">
              <span>{category.name}</span>
              <span>{category.quantity}</span>
            </div>
            <div className="w-full bg-on-primary/20 h-1 rounded-full mt-1">
              <div
                className="bg-primary-fixed h-1 rounded-full"
                style={{ width: `${category.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
