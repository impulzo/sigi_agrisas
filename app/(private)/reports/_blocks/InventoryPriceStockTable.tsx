"use client";

import { Table, THead, TBody, Tr, Th, Td } from "../../../_components/molecules/DataTable";
import type {
  DepartmentPriceListDepartmentDto,
  DepartmentProductDto,
} from "../inventory/_logic/types/api";

const MX = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});
function money(v: string): string {
  return MX.format(Number(v));
}

/**
 * Nombres únicos de lista de precio entre los departamentos dados.
 * Orden: el/los nombre(s) marcados `isDefault` en los datos van primero;
 * el resto se ordena alfabéticamente (es-MX). Copia local del algoritmo de
 * `src/modules/reports/domain/services/priceColumnNames.ts` (backend) — el
 * cliente no puede importar de `src/modules/*`.
 */
export function priceColumnNames(departments: DepartmentPriceListDepartmentDto[]): string[] {
  const isDefaultByName = new Map<string, boolean>();
  for (const dept of departments) {
    for (const product of dept.products) {
      for (const price of product.prices) {
        const current = isDefaultByName.get(price.name) ?? false;
        isDefaultByName.set(price.name, current || price.isDefault);
      }
    }
  }
  return Array.from(isDefaultByName.keys()).sort((a, b) => {
    const aDefault = isDefaultByName.get(a) ?? false;
    const bDefault = isDefaultByName.get(b) ?? false;
    if (aDefault !== bDefault) return aDefault ? -1 : 1;
    return a.localeCompare(b, "es-MX");
  });
}

function ProductRow({
  product,
  priceColumns,
}: {
  product: DepartmentProductDto;
  priceColumns: string[];
}) {
  return (
    <Tr>
      <Td>{product.code}</Td>
      <Td>{product.name}</Td>
      <Td className="text-on-surface-variant">{product.unitDescription ?? product.unit}</Td>
      <Td align="right">{product.stockQuantity}</Td>
      <Td align="right">{product.acquisitionPrice ? money(product.acquisitionPrice) : "—"}</Td>
      {priceColumns.map((name) => {
        const price = product.prices.find((p) => p.name === name);
        return (
          <Td key={name} align="right">
            {price ? money(price.price) : "—"}
          </Td>
        );
      })}
    </Tr>
  );
}

export function InventoryPriceStockTable({
  departments,
  totals,
}: {
  departments: DepartmentPriceListDepartmentDto[];
  totals: { productCount: number; priceCount: number; totalStock: string };
}) {
  const priceColumns = priceColumnNames(departments);

  return (
    <div className="space-y-5">
      {departments.map((dept) => (
        <section key={dept.departmentId} className="space-y-2">
          <h3 className="text-title-sm font-medium text-on-surface">
            {dept.departmentCode} — {dept.departmentName}
          </h3>
          <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-low">
            <Table>
              <THead>
                <tr>
                  <Th>Código</Th>
                  <Th>Producto</Th>
                  <Th>Unidad</Th>
                  <Th align="right">Stock</Th>
                  <Th align="right">Costo adq.</Th>
                  {priceColumns.map((name) => (
                    <Th key={name} align="right">
                      {name}
                    </Th>
                  ))}
                </tr>
              </THead>
              <TBody>
                {dept.products.map((product) => (
                  <ProductRow key={product.productId} product={product} priceColumns={priceColumns} />
                ))}
              </TBody>
            </Table>
          </div>
          <p className="text-label-sm text-on-surface-variant">
            {dept.subtotal.productCount} productos · {dept.subtotal.priceCount} listas de precio · Stock:{" "}
            {dept.subtotal.totalStock}
          </p>
        </section>
      ))}

      <div className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 text-body-sm">
        Totales: <span className="font-medium">{totals.productCount} productos</span> ·{" "}
        <span className="font-medium">{totals.priceCount} listas de precio</span> ·{" "}
        <span className="font-medium">Stock: {totals.totalStock}</span>
      </div>
    </div>
  );
}
