import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: "users:read", description: "Leer usuarios" },
  { key: "users:write", description: "Crear/editar usuarios" },
  { key: "roles:read", description: "Leer roles y permisos" },
  { key: "roles:write", description: "Gestionar roles y permisos" },
  { key: "payment_methods:read", description: "Leer formas de pago" },
  { key: "payment_methods:write", description: "Crear/editar formas de pago" },
  { key: "folios:read", description: "Leer folios" },
  { key: "folios:write", description: "Crear/editar folios" },
  { key: "departments:read", description: "Leer departamentos" },
  { key: "departments:write", description: "Crear/editar departamentos" },
  { key: "branches:read", description: "Leer sucursales" },
  { key: "branches:write", description: "Crear/editar sucursales" },
  { key: "providers:read", description: "Leer proveedores" },
  { key: "providers:write", description: "Crear/editar proveedores" },
  { key: "products:read", description: "Leer productos" },
  { key: "products:write", description: "Crear/editar productos" },
  { key: "inventory:read", description: "Leer inventario" },
  { key: "inventory:write", description: "Ajustar inventario" },
  { key: "customers:read", description: "Leer clientes" },
  { key: "customers:write", description: "Crear/editar clientes" },
  { key: "sales:read", description: "Leer ventas" },
  { key: "sales:create", description: "Crear ventas" },
  { key: "sales:cancel", description: "Cancelar ventas" },
  { key: "sales:edit_completed", description: "Editar ventas completadas (matriz)" },
  { key: "branches:access_all", description: "Acceder a todas las sucursales — bypass del scoping" },
  { key: "quotes:read", description: "Leer cotizaciones" },
  { key: "quotes:create", description: "Crear cotizaciones" },
  { key: "quotes:write", description: "Editar cotizaciones en borrador" },
  { key: "quotes:cancel", description: "Cancelar cotizaciones" },
  { key: "quotes:authorize", description: "Autorizar cotizaciones" },
  { key: "quotes:convert", description: "Convertir cotizaciones a ventas" },
  { key: "returns:read", description: "Leer devoluciones" },
  { key: "returns:create", description: "Registrar devoluciones" },
  { key: "returns:cancel", description: "Cancelar devoluciones" },
  { key: "sales:create_credit", description: "Autorizar venta a crédito" },
  { key: "payments:read", description: "Leer abonos" },
  { key: "payments:create", description: "Registrar abonos" },
  { key: "payments:cancel", description: "Cancelar abonos" },
  { key: "payments:report_read", description: "Consultar historial de abonos y exportar PDF" },
  { key: "reports:inventory_read", description: "Leer reportes de inventario" },
];

const ROLES: Array<{
  name: string;
  description: string;
  permissions: string[];
}> = [
  {
    name: "admin",
    description: "Administrador con acceso total",
    permissions: [
      "users:read", "users:write", "roles:read", "roles:write",
      "payment_methods:read", "payment_methods:write",
      "folios:read", "folios:write",
      "departments:read", "departments:write",
      "branches:read", "branches:write", "branches:access_all",
      "providers:read", "providers:write",
      "products:read", "products:write",
      "inventory:read", "inventory:write",
      "customers:read", "customers:write",
      "sales:read", "sales:create", "sales:cancel", "sales:edit_completed", "sales:create_credit",
      "quotes:read", "quotes:create", "quotes:write", "quotes:cancel",
      "quotes:authorize", "quotes:convert",
      "returns:read", "returns:create", "returns:cancel",
      "payments:read", "payments:create", "payments:cancel", "payments:report_read",
      "reports:inventory_read",
    ],
  },
  {
    name: "operator",
    description: "Operador con acceso de lectura a usuarios y roles",
    permissions: [
      "users:read", "roles:read",
      "payment_methods:read", "folios:read", "departments:read", "branches:read",
      "providers:read",
      "products:read", "inventory:read", "inventory:write",
      "customers:read", "customers:write",
      "sales:read", "sales:create", "sales:cancel", "sales:create_credit",
      "quotes:read", "quotes:create", "quotes:write", "quotes:cancel",
      "quotes:authorize", "quotes:convert",
      "returns:read", "returns:create", "returns:cancel",
      "payments:read", "payments:create", "payments:cancel", "payments:report_read",
      "reports:inventory_read",
    ],
  },
  {
    name: "viewer",
    description: "Visor con acceso mínimo de lectura",
    permissions: [
      "users:read",
      "payment_methods:read", "folios:read", "departments:read", "branches:read",
      "providers:read",
      "products:read", "inventory:read",
      "customers:read",
      "sales:read",
      "quotes:read",
      "returns:read",
      "payments:read", "payments:report_read",
      "reports:inventory_read",
    ],
  },
];

async function main() {
  await prisma.$transaction(
    async (tx) => {
      const permissionMap = new Map<string, string>();

      for (const perm of PERMISSIONS) {
        const result = await tx.permission.upsert({
          where: { key: perm.key },
          update: { description: perm.description },
          create: { key: perm.key, description: perm.description },
        });
        permissionMap.set(perm.key, result.id);
      }

      for (const roleDef of ROLES) {
        const role = await tx.role.upsert({
          where: { name: roleDef.name },
          update: { description: roleDef.description },
          create: { name: roleDef.name, description: roleDef.description },
        });

        for (const permKey of roleDef.permissions) {
          const permId = permissionMap.get(permKey)!;
          await tx.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
            update: {},
            create: { roleId: role.id, permissionId: permId },
          });
        }
      }
    },
    { timeout: 30000 }
  );

  // Upsert folio RECIBO (idempotente — no reset de current_number)
  await prisma.folio.upsert({
    where: { code: "RECIBO" },
    create: { code: "RECIBO", name: "Recibo de abono", prefix: "RECIBO-", isActive: true },
    update: { name: "Recibo de abono", prefix: "RECIBO-", isActive: true },
  });

  // Upsert payment method CREDITO (is_credit inmutable tras creación — no se toca en update)
  await prisma.paymentMethod.upsert({
    where: { code: "CREDITO" },
    create: {
      code: "CREDITO",
      name: "Crédito",
      description: "Venta a crédito (saldo a cuenta del cliente)",
      isCredit: true,
      isActive: true,
    },
    update: {
      name: "Crédito",
      description: "Venta a crédito (saldo a cuenta del cliente)",
      isActive: true,
    },
  });

  console.log("Seed completado: roles y permisos base creados/actualizados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
