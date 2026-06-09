import { Badge } from "../../../_components/atoms/Badge/Badge";
import { IconButton } from "../../../_components/atoms/IconButton/IconButton";
import { Skeleton } from "../../../_components/atoms/Skeleton/Skeleton";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import type { Permission } from "../_logic/types/domain";

interface AvailablePermissionsListProps {
  permissions: Permission[];
  onGrant: (permission: Permission) => void;
  isLoading: boolean;
  disabled?: boolean;
}

function getBadgeVariant(key: string): "read" | "write" | "neutral" {
  const action = key.split(":")[1];
  if (action === "read") return "read";
  if (action === "write") return "write";
  return "neutral";
}

export function AvailablePermissionsList({
  permissions,
  onGrant,
  isLoading,
  disabled,
}: AvailablePermissionsListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={48} className="w-full" />
        ))}
      </div>
    );
  }

  if (permissions.length === 0) {
    return (
      <EmptyState
        icon="add"
        title="Sin permisos disponibles"
        description="Todos los permisos del catálogo ya están asignados a este rol."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {permissions.map((perm) => (
        <li
          key={perm.id}
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-body-md text-on-surface font-mono">{perm.key}</span>
            <Badge variant={getBadgeVariant(perm.key)}>
              {perm.key.split(":")[1]}
            </Badge>
          </div>
          <IconButton
            icon="add"
            ariaLabel={`Conceder ${perm.key}`}
            variant="ghost"
            onClick={() => onGrant(perm)}
            disabled={disabled}
          />
        </li>
      ))}
    </ul>
  );
}
