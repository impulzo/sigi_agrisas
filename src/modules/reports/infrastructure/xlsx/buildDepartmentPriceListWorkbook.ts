import * as XLSX from "xlsx";
import { DepartmentPriceListResponseDto } from "../../application/dto/DepartmentPriceListResponseDto";

const HEADER = [
  "Departamento",
  "Código",
  "Producto",
  "Unidad",
  "Stock",
  "Lista",
  "Precio",
  "Cant. Mín",
  "% Descto",
  "Default",
];

/** Construye el workbook del inventario por departamento — una fila por precio, subtotales por depto y totales al final. */
export function buildDepartmentPriceListWorkbook(data: DepartmentPriceListResponseDto): Buffer {
  const rows: (string | number | null)[][] = [HEADER];

  for (const dept of data.departments) {
    for (const product of dept.products) {
      if (product.prices.length === 0) {
        rows.push([
          dept.departmentName,
          product.code,
          product.name,
          product.unit,
          product.stockQuantity,
          "—",
          null,
          null,
          null,
          "No",
        ]);
        continue;
      }
      for (const price of product.prices) {
        rows.push([
          dept.departmentName,
          product.code,
          product.name,
          product.unit,
          product.stockQuantity,
          price.name,
          price.price,
          price.minQuantity,
          price.discountPct ?? null,
          price.isDefault ? "Sí" : "No",
        ]);
      }
    }
    rows.push([
      `Subtotal ${dept.departmentName}`,
      dept.subtotal.productCount,
      dept.subtotal.priceCount,
      dept.subtotal.totalStock,
    ]);
  }

  rows.push([]);
  rows.push(["Totales"]);
  rows.push(["Departamentos", data.totals.departmentCount]);
  rows.push(["Productos", data.totals.productCount]);
  rows.push(["Listas de precio", data.totals.priceCount]);
  rows.push(["Stock total", data.totals.totalStock]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario por departamento");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
