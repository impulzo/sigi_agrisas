export const PERMISSION_GROUP_LABELS: Record<string, string> = {
  users: "Usuarios",
  roles: "Roles y Permisos",
  inventory: "Inventario",
  billing: "Facturación",
  pos: "Punto de Venta",
  reports: "Reportes",
  settings: "Configuración",
};

export function getPermissionGroupLabel(resource: string): string {
  return (
    PERMISSION_GROUP_LABELS[resource] ??
    resource.charAt(0).toUpperCase() + resource.slice(1)
  );
}
