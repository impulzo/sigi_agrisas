import { Decimal } from "decimal.js";
import {
  SalesByProductAggregates,
  SalesByProductBreakdownRow,
  SalesByProductRow,
  SalesByProductTotals,
} from "../value-objects/SalesByProductFilters";

export interface AssembledSalesByProduct {
  totals: SalesByProductTotals;
  byCustomer: SalesByProductBreakdownRow[];
  byDepartment: SalesByProductBreakdownRow[];
  byProduct: SalesByProductRow[];
}

/**
 * Servicio de dominio puro (sin I/O). Ensambla el cruce inventario × ventas a
 * partir de los agregados crudos: redondeo banker's a 4 decimales (decimal.js,
 * consistente con `SalesCutAssembler`) y ordena cada desglose descendente por total.
 */
export class SalesByProductAssembler {
  private static round(n: number): number {
    return new Decimal(n).toDecimalPlaces(4).toNumber();
  }

  private static sortByTotalDesc<T extends SalesByProductBreakdownRow>(rows: T[]): T[] {
    return [...rows].sort((a, b) => b.total - a.total);
  }

  static assemble(agg: SalesByProductAggregates): AssembledSalesByProduct {
    return {
      totals: {
        ticketCount: agg.totals.ticketCount,
        subtotal: this.round(agg.totals.subtotal),
        taxTotal: this.round(agg.totals.taxTotal),
        total: this.round(agg.totals.total),
      },
      byCustomer: this.sortByTotalDesc(
        agg.byCustomer.map((r) => ({ ...r, subtotal: this.round(r.subtotal), taxTotal: this.round(r.taxTotal), total: this.round(r.total) }))
      ),
      byDepartment: this.sortByTotalDesc(
        agg.byDepartment.map((r) => ({ ...r, subtotal: this.round(r.subtotal), taxTotal: this.round(r.taxTotal), total: this.round(r.total) }))
      ),
      byProduct: this.sortByTotalDesc(
        agg.byProduct.map((r) => ({
          ...r,
          subtotal: this.round(r.subtotal),
          taxTotal: this.round(r.taxTotal),
          total: this.round(r.total),
          quantitySold: this.round(r.quantitySold),
        }))
      ),
    };
  }
}
