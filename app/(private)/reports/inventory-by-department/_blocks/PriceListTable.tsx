"use client";

import type {
  DepartmentPriceListDepartmentDto,
  DepartmentProductDto,
} from "../_logic/types/api";

const MX = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});
function money(v: string): string {
  return MX.format(Number(v));
}
function pctOrDash(v: string | null): string {
  return v != null ? `${v}%` : "—";
}

const th = "px-3 py-3 text-left font-medium whitespace-nowrap";
const thRight = "px-3 py-3 text-right font-medium whitespace-nowrap";
const td = "px-3 py-3 whitespace-nowrap";
const tdRight = "px-3 py-3 text-right tabular-nums whitespace-nowrap";

function ProductGroup({ product }: { product: DepartmentProductDto }) {
  return (
    <>
      <tr className="bg-surface-container-high/60">
        <td className={`${td} font-medium`} colSpan={4}>
          {product.code} — {product.name}
        </td>
        <td className={`${td} text-on-surface-variant`}>{product.unit}</td>
        <td className={td} colSpan={4}></td>
      </tr>
      {product.prices.length === 0 ? (
        <tr>
          <td className={`${td} text-on-surface-variant`} colSpan={9}>
            Sin listas de precio
          </td>
        </tr>
      ) : (
        product.prices.map((p) => (
          <tr key={p.priceId} className="border-b border-outline-variant/40">
            <td className={td}></td>
            <td className={td}></td>
            <td className={td}></td>
            <td className={td}></td>
            <td className={td}></td>
            <td className={td}>{p.name}</td>
            <td className={tdRight}>{money(p.price)}</td>
            <td className={tdRight}>{p.minQuantity}</td>
            <td className={tdRight}>{pctOrDash(p.discountPct)}</td>
            <td className={tdRight}>{p.isDefault ? "Sí" : "No"}</td>
          </tr>
        ))
      )}
    </>
  );
}

export function PriceListTable({
  departments,
  totals,
}: {
  departments: DepartmentPriceListDepartmentDto[];
  totals: { productCount: number; priceCount: number };
}) {
  return (
    <div className="space-y-5">
      {departments.map((dept) => (
        <section key={dept.departmentId} className="space-y-2">
          <h3 className="text-title-sm font-medium text-on-surface">
            {dept.departmentCode} — {dept.departmentName}
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-low">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase tracking-wide">
                  <th className={th}>Código</th>
                  <th className={th}>Producto</th>
                  <th className={th}>Unidad</th>
                  <th className={th}></th>
                  <th className={th}></th>
                  <th className={th}>Lista</th>
                  <th className={thRight}>Precio</th>
                  <th className={thRight}>Cant. mín</th>
                  <th className={thRight}>% Descto</th>
                  <th className={thRight}>Default</th>
                </tr>
              </thead>
              <tbody>
                {dept.products.map((product) => (
                  <ProductGroup key={product.productId} product={product} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-label-sm text-on-surface-variant">
            {dept.subtotal.productCount} productos · {dept.subtotal.priceCount} listas de precio
          </p>
        </section>
      ))}

      <div className="rounded-2xl border border-outline-variant bg-surface-container px-4 py-3 text-body-sm">
        Totales: <span className="font-medium">{totals.productCount} productos</span> ·{" "}
        <span className="font-medium">{totals.priceCount} listas de precio</span>
      </div>
    </div>
  );
}
