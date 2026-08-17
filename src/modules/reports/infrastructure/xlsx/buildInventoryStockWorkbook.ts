import * as XLSX from "xlsx";
import { StockReportResponseDto } from "../../application/dto/StockReportResponseDto";

const HEADER = [
  "Código",
  "Producto",
  "Unidad",
  "Stock",
  "Reservado",
  "Disponible",
  "Reorden",
  "Estado",
];

/** Construye el workbook de stock — una fila por producto, agrupado por sucursal → departamento, con subtotales y totales. */
export function buildInventoryStockWorkbook(data: StockReportResponseDto): Buffer {
  const rows: (string | number)[][] = [];

  for (const branch of data.branches) {
    rows.push([`${branch.branchCode} — ${branch.branchName}${branch.isHeadquarters ? "  [Matriz]" : ""}`]);
    for (const dept of branch.departments) {
      rows.push([dept.departmentName]);
      rows.push(HEADER);
      for (const p of dept.products) {
        rows.push([
          p.code,
          p.name,
          p.unitDescription ?? p.unit,
          p.quantity,
          p.reservedQuantity,
          p.availableQuantity,
          p.reorderPoint,
          p.isBelowReorder ? "Bajo" : "OK",
        ]);
      }
      rows.push([`Subtotal ${dept.departmentName}`, dept.subtotal.productCount, dept.subtotal.totalQuantity]);
      rows.push([]);
    }
    rows.push([`Subtotal ${branch.branchName}`, branch.subtotal.departmentCount, branch.subtotal.productCount, branch.subtotal.totalQuantity]);
    rows.push([]);
  }

  rows.push(["Totales"]);
  rows.push(["Sucursales", data.totals.branchCount]);
  rows.push(["Departamentos", data.totals.departmentCount]);
  rows.push(["Productos", data.totals.productCount]);
  rows.push(["Cantidad total", data.totals.totalQuantity]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Stock");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
