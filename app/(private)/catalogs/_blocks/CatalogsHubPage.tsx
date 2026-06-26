"use client";

import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { CatalogHubCard } from "./CatalogHubCard";

const CATALOG_CARDS = [
  {
    key: "payment-methods",
    icon: "payments" as const,
    title: "Formas de pago",
    description: "Gestiona los métodos de pago aceptados.",
    href: "/catalogs/payment-methods",
    permission: "payment_methods:read",
  },
  {
    key: "folios",
    icon: "tag" as const,
    title: "Folios",
    description: "Gestiona las series de numeración de documentos.",
    href: "/catalogs/folios",
    permission: "folios:read",
  },
  {
    key: "departments",
    icon: "apartment" as const,
    title: "Departamentos",
    description: "Gestiona los departamentos de la organización.",
    href: "/catalogs/departments",
    permission: "departments:read",
  },
  {
    key: "branches",
    icon: "store" as const,
    title: "Sucursales",
    description: "Gestiona las sucursales de la organización.",
    href: "/catalogs/branches",
    permission: "branches:read",
  },
  {
    key: "providers",
    icon: "local_shipping" as const,
    title: "Proveedores",
    description: "Gestiona los proveedores y sus datos fiscales.",
    href: "/catalogs/providers",
    permission: "providers:read",
  },
  {
    key: "products",
    icon: "inventory_2" as const,
    title: "Productos",
    description: "Gestiona el catálogo de productos con precios y dosificaciones.",
    href: "/catalogs/products",
    permission: "products:read",
  },
  {
    key: "tax-rates",
    icon: "percent" as const,
    title: "Tasas de Impuesto",
    description: "Gestiona las tasas de IVA e IEPS aplicables a productos.",
    href: "/catalogs/tax-rates",
    permission: "tax_rates:read",
  },
];

export function CatalogsHubPage() {
  const { can } = useCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-headline-lg font-semibold text-on-surface">Catálogos</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Administra los catálogos del sistema
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CATALOG_CARDS.map((card) => {
          const canAccess = can(card.permission);
          return (
            <CatalogHubCard
              key={card.key}
              icon={card.icon}
              title={card.title}
              description={card.description}
              href={card.href}
              canAccess={canAccess}
              tooltip={canAccess === false ? `Requiere permiso ${card.permission}` : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
