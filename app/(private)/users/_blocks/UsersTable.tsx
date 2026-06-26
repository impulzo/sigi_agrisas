"use client";

import { Avatar } from "../../../_components/atoms/Avatar/Avatar";
import { Badge } from "../../../_components/atoms/Badge/Badge";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import { Skeleton } from "../../../_components/atoms/Skeleton/Skeleton";
import type { User } from "../_logic/types/domain";
import { useTableKeyboard } from "../../../_hooks/useTableKeyboard";

function formatRelativeDate(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoy";
  if (days === 1) return "Hace 1 día";
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months === 1) return "Hace 1 mes";
  if (months < 12) return `Hace ${months} meses`;
  const years = Math.floor(months / 12);
  return `Hace ${years} año${years > 1 ? "s" : ""}`;
}

interface UsersTableProps {
  users: User[];
  currentUserId: string;
  canWrite: boolean;
  isLoading?: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onEnter?: (user: User) => void;
}

export function UsersTable({
  users,
  currentUserId,
  canWrite,
  isLoading,
  onEdit,
  onDelete,
  onEnter,
}: UsersTableProps) {
  const noop = () => {};
  const { getRowProps } = useTableKeyboard(users, onEnter ?? noop);
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={56} className="w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body-md">
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container">
            <th className="text-left px-4 py-3 text-label-lg text-on-surface-variant font-medium">Usuario</th>
            <th className="text-left px-4 py-3 text-label-lg text-on-surface-variant font-medium">Email</th>
            <th className="text-left px-4 py-3 text-label-lg text-on-surface-variant font-medium">Roles</th>
            <th className="text-left px-4 py-3 text-label-lg text-on-surface-variant font-medium">Creado</th>
            {canWrite && (
              <th className="text-right px-4 py-3 text-label-lg text-on-surface-variant font-medium">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody>
          {users.map((user, idx) => {
            const isSelf = user.id === currentUserId;
            return (
              <tr
                key={user.id}
                {...getRowProps(idx)}
                className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low focus:bg-surface-container focus:outline-none transition-colors cursor-default"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={user.avatarUrl} alt={user.name ?? user.email} size="sm" fallbackInitials={(user.name ?? user.email)[0].toUpperCase()} />
                    <span className="text-on-surface font-medium">{user.name ?? <span className="text-on-surface-variant">—</span>}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{user.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.length === 0 ? (
                      <span className="text-on-surface-variant">—</span>
                    ) : (
                      user.roles.map((role) => (
                        <Badge key={role} variant="neutral">{role}</Badge>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span title={user.createdAt.toISOString()} className="text-on-surface-variant text-label-lg cursor-help">
                    {formatRelativeDate(user.createdAt)}
                  </span>
                </td>
                {canWrite && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(user)}
                        disabled={isSelf}
                        title={isSelf ? "No puedes editar tu propia cuenta" : "Editar usuario"}
                        className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Icon name="edit" size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(user)}
                        disabled={isSelf}
                        title={isSelf ? "No puedes eliminar tu propia cuenta" : "Eliminar usuario"}
                        className="p-2 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Icon name="delete" size={18} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
