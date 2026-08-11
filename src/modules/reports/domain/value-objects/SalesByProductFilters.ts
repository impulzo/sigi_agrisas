/** Filtros del reporte de ventas por producto. `from`/`to` ya resueltos en el controller. */
export interface SalesByProductFilters {
  branchId: string | null;
  departmentId: string | null;
  customerId: string | null;
  from: Date;
  to: Date;
}

/** Fila de un desglose (por cliente o por departamento). */
export interface SalesByProductBreakdownRow {
  key: string;
  label: string;
  ticketCount: number;
  subtotal: number;
  taxTotal: number;
  total: number;
}

/** Fila del desglose por producto: piezas vendidas + stock actual (cruce inventario × ventas). */
export interface SalesByProductRow extends SalesByProductBreakdownRow {
  quantitySold: number;
  currentStock: number;
}

/** Totales globales del periodo/filtros, constantes sin importar el modo de agrupación de la UI. */
export interface SalesByProductTotals {
  ticketCount: number;
  subtotal: number;
  taxTotal: number;
  total: number;
}

/** Bolsa de agregados crudos que devuelve el repositorio. */
export interface SalesByProductAggregates {
  totals: SalesByProductTotals;
  byCustomer: SalesByProductBreakdownRow[];
  byDepartment: SalesByProductBreakdownRow[];
  byProduct: SalesByProductRow[];
}
