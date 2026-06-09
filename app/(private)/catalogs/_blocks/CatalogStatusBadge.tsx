import { cn } from "../../../_lib/cn";

interface CatalogStatusBadgeProps {
  isActive: boolean;
}

export function CatalogStatusBadge({ isActive }: CatalogStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium",
        isActive
          ? "bg-tertiary-container text-on-tertiary-container"
          : "bg-surface-container-high text-on-surface-variant"
      )}
    >
      {isActive ? "Activo" : "Inactivo"}
    </span>
  );
}
