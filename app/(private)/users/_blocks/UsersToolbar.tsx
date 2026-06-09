import { cn } from "../../../_lib/cn";
import { Icon } from "../../../_components/atoms/Icon/Icon";

interface UsersToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  activeRoles: string[];
  availableRoles: string[];
  onToggleRole: (role: string) => void;
  onClearFilters: () => void;
}

export function UsersToolbar({
  search,
  onSearchChange,
  activeRoles,
  availableRoles,
  onToggleRole,
  onClearFilters,
}: UsersToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
          <Icon name="search" size={18} />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nombre o email"
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onClearFilters}
          className={cn(
            "px-3 py-1 rounded-full text-label-lg transition-colors",
            activeRoles.length === 0
              ? "bg-primary text-on-primary"
              : "bg-surface-container text-on-surface hover:bg-surface-container-high"
          )}
        >
          Todos
        </button>
        {availableRoles.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => onToggleRole(role)}
            className={cn(
              "px-3 py-1 rounded-full text-label-lg transition-colors",
              activeRoles.includes(role)
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface hover:bg-surface-container-high"
            )}
          >
            {role}
          </button>
        ))}
      </div>
    </div>
  );
}
