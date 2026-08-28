/**
 * Formas de fila compartidas entre el generador (`generate-inventario-tiendas-data.ts`)
 * y el archivo de datos embebidos que este emite (`inventario-tiendas-v3.ts`), para que
 * ambos no puedan divergir en su forma sin que el compilador lo detecte.
 */

export interface TiendaInventoryRow {
  code: string;
  name: string;
  unit: string;
  satCode: string | null;
  price: number;
  departmentName: string | null;
  branchCode: string;
}

export interface AgrisasRefreshRow {
  code: string;
  name: string;
  unit: string;
  satCode: string | null;
  departmentName: string;
  ivaRaw: number;
  iepsRaw: number;
  existencia: number;
  prices: Array<{ tierName: string; value: number; isDefault?: boolean }>;
}

export interface TlaxiacoRawRow {
  tlaxiacoRawCode: number | string;
  name: string;
  unit: string;
  satCode: string | null;
  price: number;
  departmentName: string | null;
  branchCode: "TLAXIACO";
}
