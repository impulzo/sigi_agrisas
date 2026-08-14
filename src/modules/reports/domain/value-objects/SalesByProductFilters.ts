/** Filtros del reporte de ventas por producto. `from`/`to` ya resueltos en el controller. */
export interface SalesByProductFilters {
  branchId: string | null;
  departmentId: string | null;
  customerId: string | null;
  from: Date;
  to: Date;
}

/** Totales globales del periodo/filtros. */
export interface SalesByProductTotals {
  ticketCount: number;
  subtotal: number;
  taxTotal: number;
  total: number;
}

/** Fila de detalle: cruce Departamento + Producto + Cliente, con cantidad y monto vendidos. */
export interface SalesByProductDetailRow {
  departmentId: string;
  departmentName: string;
  productId: string;
  productCode: string;
  productName: string;
  customerId: string | null;
  customerName: string;
  quantity: number;
  total: number;
}

/** Página de resultados que devuelve el repositorio: totales + filas de detalle paginadas. */
export interface SalesByProductPage {
  totals: SalesByProductTotals;
  rows: SalesByProductDetailRow[];
  rowsTotal: number;
}
