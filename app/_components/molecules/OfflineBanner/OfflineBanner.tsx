import { Icon } from "../../atoms/Icon/Icon";
import { cn } from "../../../_lib/cn";

interface OfflineBannerProps {
  isOnline: boolean;
  catalogStalenessMs: number | null;
  /** Minutes above which staleness is shown with a warning tone. Default 60. */
  warnAfterMinutes?: number;
  className?: string;
}

function formatStaleness(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "hace instantes";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h`;
}

export function OfflineBanner({
  isOnline,
  catalogStalenessMs,
  warnAfterMinutes = 60,
  className,
}: OfflineBannerProps) {
  if (isOnline && catalogStalenessMs === null) return null;

  if (catalogStalenessMs === null) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md bg-error-container text-on-error-container px-4 py-2 text-body-sm",
          className
        )}
      >
        <Icon name="cloud_off" size={18} />
        <span>Sin conexión y sin catálogo cacheado — conéctate al menos una vez antes de operar offline.</span>
      </div>
    );
  }

  const isStale = catalogStalenessMs > warnAfterMinutes * 60_000;

  if (isOnline && !isStale) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-4 py-2 text-body-sm",
        !isOnline
          ? "bg-error-container text-on-error-container"
          : "bg-secondary-container/40 text-on-secondary-container",
        className
      )}
    >
      <Icon name={isOnline ? "update" : "cloud_off"} size={18} />
      <span>
        {!isOnline && "Sin conexión — mostrando datos cacheados. "}
        Catálogo actualizado {formatStaleness(catalogStalenessMs)}
        {isStale && " — puede estar desactualizado"}.
      </span>
    </div>
  );
}
