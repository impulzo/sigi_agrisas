import { Chip } from "../../atoms/Chip/Chip";

interface SyncStatusBadgeProps {
  isOnline: boolean;
  syncing: boolean;
  pendingCount: number;
  className?: string;
}

export function SyncStatusBadge({ isOnline, syncing, pendingCount, className }: SyncStatusBadgeProps) {
  if (!isOnline) {
    return <Chip label="Sin conexión — modo offline" tone="error" icon="cloud_off" className={className} />;
  }
  if (syncing) {
    return (
      <Chip
        label={pendingCount > 0 ? `Sincronizando… (${pendingCount})` : "Sincronizando…"}
        tone="warning"
        icon="sync"
        className={className}
      />
    );
  }
  if (pendingCount > 0) {
    return (
      <Chip
        label={`${pendingCount} pendiente${pendingCount === 1 ? "" : "s"} de sincronizar`}
        tone="warning"
        icon="sync"
        className={className}
      />
    );
  }
  return <Chip label="Todo sincronizado" tone="success" icon="cloud_done" className={className} />;
}
