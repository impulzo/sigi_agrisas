import { SalePaymentStatus } from "../value-objects/SalePaymentStatus";

export interface SaleForPayment {
  total: number;
  paidAmount: number;
  isCredit: boolean;
}

export interface ApplyPaymentResult {
  newPaidAmount: number;
  newPaymentStatus: SalePaymentStatus;
}

export class SalePaymentApplier {
  static applyPayment(sale: SaleForPayment, delta: number): ApplyPaymentResult {
    const newPaidAmount = sale.paidAmount + delta;
    const newPaymentStatus = SalePaymentApplier.computeStatus(newPaidAmount, sale.total);
    return { newPaidAmount, newPaymentStatus };
  }

  static cancelPayment(sale: SaleForPayment, delta: number): ApplyPaymentResult {
    const newPaidAmount = Math.max(0, sale.paidAmount - delta);
    const newPaymentStatus = SalePaymentApplier.computeStatus(newPaidAmount, sale.total);
    return { newPaidAmount, newPaymentStatus };
  }

  private static computeStatus(paidAmount: number, total: number): SalePaymentStatus {
    if (paidAmount >= total) return "paid";
    if (paidAmount > 0) return "partial";
    return "pending";
  }
}
