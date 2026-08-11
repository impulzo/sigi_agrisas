"use client";

import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { CatalogHubCard } from "../../catalogs/_blocks/CatalogHubCard";

export function ReportsHubPage() {
  const { can } = useCurrentUser();

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-headline-sm font-semibold text-on-surface">Reportes</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CatalogHubCard
          icon="summarize"
          title="Estados de Cuenta"
          description="Saldos de crédito y libro mayor por cliente."
          href="/reports/account-statements"
          canAccess={can("reports:account_statements_read")}
          tooltip="Requiere permiso reports:account_statements_read"
        />
        <CatalogHubCard
          icon="summarize"
          title="Corte de Ventas"
          description="Corte del día o por rango: totales, neto de caja y desgloses."
          href="/reports/sales-cut"
          canAccess={can("reports:sales_cut_read")}
          tooltip="Requiere permiso reports:sales_cut_read"
        />
        <CatalogHubCard
          icon="payments"
          title="Corte de Caja (Cobranza)"
          description="Detalle de abonos cobrados por cliente/factura, con IVA prorrateado y export PDF/Excel."
          href="/reports/cash-cut"
          canAccess={can("reports:cash_cut_read")}
          tooltip="Requiere permiso reports:cash_cut_read"
        />
        <CatalogHubCard
          icon="inventory_2"
          title="Inventario por Departamento"
          description="Productos del catálogo con sus listas de precio, agrupados por producto."
          href="/reports/inventory-by-department"
          canAccess={can("reports:inventory_read")}
          tooltip="Requiere permiso reports:inventory_read"
        />
        <CatalogHubCard
          icon="local_shipping"
          title="Compras"
          description="Compras y pagos a proveedores, con filtros y export PDF/Excel."
          href="/reports/purchases"
          canAccess={can("reports:purchases_read")}
          tooltip="Requiere permiso reports:purchases_read"
        />
        <CatalogHubCard
          icon="trending_up"
          title="Ventas por Producto"
          description="Cruce inventario × ventas, agrupable por cliente, departamento o producto."
          href="/reports/sales-by-product"
          canAccess={can("reports:sales_by_product_read")}
          tooltip="Requiere permiso reports:sales_by_product_read"
        />
        <CatalogHubCard
          icon="groups"
          title="Cobranza por Cliente"
          description="Cobranza agrupable por cliente y por ticket abonado."
          href="/reports/customer-collections"
          canAccess={can("reports:customer_collections_read")}
          tooltip="Requiere permiso reports:customer_collections_read"
        />
      </div>
    </div>
  );
}
