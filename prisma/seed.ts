import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { seedTaxRates } from "./seeds/taxRates";

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
  { key: "reports:read", description: "Ver dashboard de KPIs y reportes" },
  { key: "tax_rates:read", description: "Leer tasas de impuesto" },
  { key: "tax_rates:write", description: "Crear/editar tasas de impuesto" },
  { key: "billing:read", description: "Ver facturas CFDI" },
  { key: "billing:write", description: "Emitir facturas CFDI" },
  { key: "billing:cancel", description: "Cancelar facturas CFDI" },
  { key: "billing:manage_csd", description: "Gestionar Certificado de Sello Digital (CSD)" },
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
      "reports:read",
      "tax_rates:read", "tax_rates:write",
      "billing:read", "billing:write", "billing:cancel", "billing:manage_csd",
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
      "tax_rates:read", "tax_rates:write",
      "billing:read", "billing:write", "billing:cancel",
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
      "tax_rates:read",
      "billing:read",
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

  // Métodos de pago base (is_credit inmutable tras creación — no se toca en update)
  await prisma.paymentMethod.upsert({
    where: { code: "EFECTIVO" },
    create: {
      code: "EFECTIVO",
      name: "Efectivo",
      description: "Pago en efectivo",
      isCredit: false,
      isActive: true,
    },
    update: {
      name: "Efectivo",
      description: "Pago en efectivo",
      isActive: true,
    },
  });

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

  // Sucursal matriz mínima (idempotente; seed:inventory puede sobrescribir con datos del Excel)
  const existingHq = await prisma.branch.findFirst({ where: { isHeadquarters: true } });
  if (!existingHq) {
    await prisma.branch.upsert({
      where: { code: "MATRIZ" },
      create: {
        code: "MATRIZ",
        name: "Matriz",
        isHeadquarters: true,
        isActive: true,
      },
      update: { isHeadquarters: true, isActive: true },
    });
  }

  await seedTaxRates(prisma);

  // Usuario admin por defecto — solo si SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD están definidos
  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL;
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (seedAdminEmail && seedAdminPassword) {
    const existingAdmin = await prisma.user.findUnique({ where: { email: seedAdminEmail } });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(seedAdminPassword, 10);
      const newAdmin = await prisma.user.create({
        data: { email: seedAdminEmail, name: "Admin", passwordHash },
      });
      const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
      if (adminRole) {
        await prisma.userRole.create({
          data: { userId: newAdmin.id, roleId: adminRole.id },
        });
      }
      console.log(`Usuario admin creado: ${seedAdminEmail}`);
    } else {
      console.log("Usuario admin ya existe:", seedAdminEmail);
    }
  } else {
    console.log("SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD no definidos — se omite creación de admin.");
  }

  console.log("Seed completado: roles, permisos, métodos de pago, tasas y sucursal base creados/actualizados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
