import Image from "next/image";
import { cn } from "../../../_lib/cn";
import type { LogisticsHub, HubStatus } from "../_logic/types/domain";

interface LogisticsMapProps {
  data: LogisticsHub;
}

const statusConfig: Record<HubStatus, { dot: string; label: string }> = {
  operational: {
    dot: "bg-primary animate-pulse",
    label: "All systems operational",
  },
  degraded: { dot: "bg-secondary", label: "Performance degraded" },
  down: { dot: "bg-error", label: "Hub offline" },
};

export function LogisticsMap({ data }: LogisticsMapProps) {
  const status = statusConfig[data.status];

  return (
    <div className="bg-surface-container-high rounded-xl overflow-hidden h-[300px] relative">
      <Image
        src={data.mapImageSrc}
        alt={`Mapa de ${data.hubName}`}
        fill
        sizes="(max-width: 1280px) 100vw, 1280px"
        className="object-cover"
        priority={false}
        unoptimized
      />
      <div className="absolute bottom-4 left-4 bg-surface-container-lowest/90 backdrop-blur p-4 rounded-lg border border-outline-variant">
        <p className="text-title-md text-on-surface">{data.hubName}</p>
        <div className="flex items-center gap-sm mt-1">
          <span className={cn("w-2 h-2 rounded-full", status.dot)} />
          <p className="text-label-sm text-on-surface-variant">{status.label}</p>
        </div>
      </div>
    </div>
  );
}
