import { PurchasePaymentApplier } from "@/modules/purchases/domain/services/PurchasePaymentApplier";

describe("PurchasePaymentApplier", () => {
  describe("applyPayment", () => {
    it("returns partial when paidAmount < total", () => {
      const result = PurchasePaymentApplier.applyPayment({ total: 1000, paidAmount: 0 }, 300);
      expect(result.newPaidAmount).toBe(300);
      expect(result.newPaymentStatus).toBe("partial");
    });

    it("returns paid when paidAmount >= total", () => {
      const result = PurchasePaymentApplier.applyPayment({ total: 1000, paidAmount: 700 }, 300);
      expect(result.newPaidAmount).toBe(1000);
      expect(result.newPaymentStatus).toBe("paid");
    });
  });

  describe("cancelPayment", () => {
    it("returns pending when cancelling the only payment", () => {
      const result = PurchasePaymentApplier.cancelPayment({ total: 1000, paidAmount: 300 }, 300);
      expect(result.newPaidAmount).toBe(0);
      expect(result.newPaymentStatus).toBe("pending");
    });

    it("returns partial when some payments remain", () => {
      const result = PurchasePaymentApplier.cancelPayment({ total: 1000, paidAmount: 700 }, 300);
      expect(result.newPaidAmount).toBe(400);
      expect(result.newPaymentStatus).toBe("partial");
    });

    it("never goes below zero", () => {
      const result = PurchasePaymentApplier.cancelPayment({ total: 1000, paidAmount: 100 }, 300);
      expect(result.newPaidAmount).toBe(0);
      expect(result.newPaymentStatus).toBe("pending");
    });
  });
});
