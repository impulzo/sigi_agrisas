import { ReactNode } from "react";
import { Icon } from "../../atoms/Icon/Icon";
import type { IconName } from "../../atoms/Icon/icons";
import { cn } from "../../../_lib/cn";

interface EmptyStateProps {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 py-12 px-6 text-center", className)}>
      <Icon name={icon} size={48} className="text-on-surface-variant opacity-60" />
      <div className="flex flex-col gap-1">
        <p className="text-headline-sm font-semibold text-on-surface">{title}</p>
        {description && (
          <p className="text-body-md text-on-surface-variant max-w-xs">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
