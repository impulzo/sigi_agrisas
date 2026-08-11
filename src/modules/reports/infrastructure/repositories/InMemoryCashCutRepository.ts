import { CashCutRepository } from "../../application/ports/CashCutRepository";
import { CashCutFilters, CashCutRawRow } from "../../domain/value-objects/CashCutFilters";

export interface InMemCutPayment {
  paymentId: string;
  saleId: string;
  status: string; // completed | cancelled
  branchId: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  docto: string;
  factura: string;
  facturaDate: Date;
  amount: number;
  paymentMethodId: string;
  paymentMethodCode: string;
  paymentMethodName: string;
  reference: string | null;
  collectedAt: Date;
  saleTaxTotal: number;
  saleSubtotal: number;
  saleTotal: number;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export class InMemoryCashCutRepository implements CashCutRepository {
  constructor(private readonly payments: InMemCutPayment[]) {}

  async findRows(f: CashCutFilters): Promise<CashCutRawRow[]> {
    const to = endOfDay(f.to);
    const matches = this.payments.filter(
      (p) =>
        p.status === "completed" &&
        p.collectedAt >= f.from &&
        p.collectedAt <= to &&
        (!f.branchId || p.branchId === f.branchId) &&
        (!f.customerId || p.customerId === f.customerId) &&
        (!f.paymentMethodId || p.paymentMethodId === f.paymentMethodId)
    );

    return matches.map((p) => ({
      paymentId: p.paymentId,
      saleId: p.saleId,
      customerId: p.customerId,
      customerCode: p.customerCode,
      docto: p.docto,
      factura: p.factura,
      customerName: p.customerName,
      facturaDate: p.facturaDate,
      amount: p.amount,
      paymentMethodId: p.paymentMethodId,
      paymentMethodCode: p.paymentMethodCode,
      paymentMethodName: p.paymentMethodName,
      reference: p.reference,
      collectedAt: p.collectedAt,
      saleTaxTotal: p.saleTaxTotal,
      saleSubtotal: p.saleSubtotal,
      saleTotal: p.saleTotal,
    }));
  }
}
