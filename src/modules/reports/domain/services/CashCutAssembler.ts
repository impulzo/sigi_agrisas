import { Decimal } from "decimal.js";
import { CashCutRawRow } from "../value-objects/CashCutFilters";

const MS_PER_DAY = 86_400_000;

export interface AssembledCashCutRow {
  paymentId: string;
  customerCode: string;
  docto: string;
  factura: string;
  customerName: string;
  facturaDate: Date;
  days: number;
  amount: number;
  paymentMethodId: string;
  paymentMethodCode: string;
  paymentMethodName: string;
  reference: string | null;
  collectedAt: Date;
  ivaAmount: number;
  taxRatePct: number;
}

export interface CashCutPaymentMethodBreakdownRow {
  paymentMethodId: string;
  code: string;
  label: string;
  count: number;
  total: number;
}

export interface AssembledCashCut {
  rows: AssembledCashCutRow[];
  totals: { totalCollected: number; totalIva: number };
  byPaymentMethod: CashCutPaymentMethodBreakdownRow[];
}

/**
 * Servicio de dominio puro (sin I/O). Por cada abono calcula `days` (F.Cobro −
 * Fec-Fact) y prorratea IVA/Tasa% desde la venta ligada (customer_payments no
 * guarda IVA propio). Arma totales y desglose dinámico por forma de pago.
 * Redondeo banker's a 4 decimales (decimal.js), consistente con
 * `SalesCutAssembler`.
 */
export class CashCutAssembler {
  private static round(n: number): number {
    return new Decimal(n).toDecimalPlaces(4).toNumber();
  }

  static assemble(rawRows: CashCutRawRow[]): AssembledCashCut {
    const rows: AssembledCashCutRow[] = rawRows.map((r) => {
      const days = Math.floor(
        (r.collectedAt.getTime() - r.facturaDate.getTime()) / MS_PER_DAY
      );

      const amount = new Decimal(r.amount);
      const saleTotal = new Decimal(r.saleTotal);
      const saleTaxTotal = new Decimal(r.saleTaxTotal);
      const saleSubtotal = new Decimal(r.saleSubtotal);

      const ivaAmount = saleTotal.isZero()
        ? new Decimal(0)
        : amount.times(saleTaxTotal).dividedBy(saleTotal);
      const taxRatePct = saleSubtotal.isZero()
        ? new Decimal(0)
        : saleTaxTotal.dividedBy(saleSubtotal);

      return {
        paymentId: r.paymentId,
        customerCode: r.customerCode,
        docto: r.docto,
        factura: r.factura,
        customerName: r.customerName,
        facturaDate: r.facturaDate,
        days,
        amount: this.round(r.amount),
        paymentMethodId: r.paymentMethodId,
        paymentMethodCode: r.paymentMethodCode,
        paymentMethodName: r.paymentMethodName,
        reference: r.reference,
        collectedAt: r.collectedAt,
        ivaAmount: ivaAmount.toDecimalPlaces(4).toNumber(),
        taxRatePct: taxRatePct.toDecimalPlaces(4).toNumber(),
      };
    });

    const totalCollected = rows.reduce((acc, r) => acc + r.amount, 0);
    const totalIva = rows.reduce((acc, r) => acc + r.ivaAmount, 0);

    const byPaymentMethodMap = new Map<string, CashCutPaymentMethodBreakdownRow>();
    for (const r of rows) {
      const existing = byPaymentMethodMap.get(r.paymentMethodId) ?? {
        paymentMethodId: r.paymentMethodId,
        code: r.paymentMethodCode,
        label: r.paymentMethodName,
        count: 0,
        total: 0,
      };
      existing.count += 1;
      existing.total += r.amount;
      byPaymentMethodMap.set(r.paymentMethodId, existing);
    }
    const byPaymentMethod = [...byPaymentMethodMap.values()]
      .map((row) => ({ ...row, total: this.round(row.total) }))
      .sort((a, b) => b.total - a.total);

    return {
      rows,
      totals: {
        totalCollected: this.round(totalCollected),
        totalIva: this.round(totalIva),
      },
      byPaymentMethod,
    };
  }
}
