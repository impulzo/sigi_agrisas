import * as XLSX from "xlsx";
import { DepartmentPriceListResponseDto } from "../../application/dto/DepartmentPriceListResponseDto";
import { priceColumnNames } from "../../domain/services/priceColumnNames";

const BASE_HEADER = ["Departamento", "Código", "Producto", "Unidad", "Stock"];

/** Construye el workbook del inventario por departamento — una fila por producto, precios pivotados como columnas, con subtotales por depto y totales al final. */
export function buildDepartmentPriceListWorkbook(data: DepartmentPriceListResponseDto): Buffer {
  const rows: (string | number | null)[][] = [];

  for (const dept of data.departments) {
    const priceCols = priceColumnNames([dept]);
    rows.push([...BASE_HEADER, ...priceCols]);

    for (const product of dept.products) {
      const priceValues = priceCols.map((name) => {
        const price = product.prices.find((p) => p.name === name);
        return price ? price.price : "—";
      });
      rows.push([
        dept.departmentName,
        product.code,
        product.name,
        product.unitDescription ?? product.unit,
        product.stockQuantity,
        ...priceValues,
      ]);
    }

    rows.push([
      `Subtotal ${dept.departmentName}`,
      dept.subtotal.productCount,
      dept.subtotal.priceCount,
      dept.subtotal.totalStock,
    ]);
    rows.push([]);
  }

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
