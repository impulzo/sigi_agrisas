import { PurchasePaymentStatus } from "../value-objects/PurchasePaymentStatus";

export interface PurchaseForPayment {
  total: number;
  paidAmount: number;
}

export interface ApplyProviderPaymentResult {
  newPaidAmount: number;
  newPaymentStatus: PurchasePaymentStatus;
}

export class PurchasePaymentApplier {
  static applyPayment(purchase: PurchaseForPayment, delta: number): ApplyProviderPaymentResult {
    const newPaidAmount = purchase.paidAmount + delta;
    const newPaymentStatus = PurchasePaymentApplier.computeStatus(newPaidAmount, purchase.total);
    return { newPaidAmount, newPaymentStatus };
  }

  static cancelPayment(purchase: PurchaseForPayment, delta: number): ApplyProviderPaymentResult {
    const newPaidAmount = Math.max(0, purchase.paidAmount - delta);
    const newPaymentStatus = PurchasePaymentApplier.computeStatus(newPaidAmount, purchase.total);
    return { newPaidAmount, newPaymentStatus };
  }

  private static computeStatus(paidAmount: number, total: number): PurchasePaymentStatus {
    if (paidAmount >= total) return "paid";
    if (paidAmount > 0) return "partial";
    return "pending";
  }
}
