import { Card } from "../../../_components/molecules/Card/Card";
import { cn } from "../../../_lib/cn";
import type { ActivityEvent } from "../_logic/types/domain";

interface ActivityFeedProps {
  items: ActivityEvent[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-lg">
        <h4 className="text-title-md text-on-surface">Recent Activity</h4>
        <button
          type="button"
          className="text-primary text-label-lg hover:bg-primary/10 px-3 py-1 rounded-lg"
        >
          View All
        </button>
      </div>
      <div className="relative pl-6 space-y-xl before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant">
        {items.map((event) => (
          <div key={event.id} className="relative">
            <span className="absolute -left-6 top-1 w-6 h-6 bg-surface-container-lowest flex items-center justify-center">
              <span
                className={cn(
                  "w-3 h-3 rounded-full",
                  event.isLatest
                    ? "bg-primary ring-4 ring-primary/20"
                    : "bg-outline",
                )}
              />
            </span>
            <div>
              <p className="text-title-md text-on-surface">
                {event.title}{" "}
                <span className="text-on-surface-variant font-normal">
                  {event.subject}
                </span>
              </p>
              <p className="text-label-sm text-on-surface-variant">
                {event.timestamp} • {event.meta}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
