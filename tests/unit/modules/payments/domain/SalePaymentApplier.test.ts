import { SalePaymentApplier } from "@/modules/payments/domain/services/SalePaymentApplier";

describe("SalePaymentApplier", () => {
  describe("applyPayment", () => {
    it("returns partial when paidAmount < total", () => {
      const result = SalePaymentApplier.applyPayment(
        { total: 1000, paidAmount: 0, isCredit: true },
        300
      );
      expect(result.newPaidAmount).toBe(300);
      expect(result.newPaymentStatus).toBe("partial");
    });

    it("returns paid when paidAmount >= total", () => {
      const result = SalePaymentApplier.applyPayment(
        { total: 1000, paidAmount: 700, isCredit: true },
        300
      );
      expect(result.newPaidAmount).toBe(1000);
      expect(result.newPaymentStatus).toBe("paid");
    });
  });

  describe("cancelPayment", () => {
    it("returns pending when cancelling the only payment", () => {
      const result = SalePaymentApplier.cancelPayment(
        { total: 1000, paidAmount: 300, isCredit: true },
        300
      );
      expect(result.newPaidAmount).toBe(0);
      expect(result.newPaymentStatus).toBe("pending");
    });

    it("returns partial when some payments remain", () => {
      const result = SalePaymentApplier.cancelPayment(
        { total: 1000, paidAmount: 700, isCredit: true },
        300
      );
      expect(result.newPaidAmount).toBe(400);
      expect(result.newPaymentStatus).toBe("partial");
    });

    it("returns paid after cancelling partial payment that still leaves full coverage", () => {
      const result = SalePaymentApplier.cancelPayment(
        { total: 1000, paidAmount: 1200, isCredit: true },
        100
      );
      expect(result.newPaidAmount).toBe(1100);
      expect(result.newPaymentStatus).toBe("paid");
    });
  });
});
