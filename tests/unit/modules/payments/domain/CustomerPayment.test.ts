import { CustomerPayment } from "@/modules/payments/domain/entities/CustomerPayment";

describe("CustomerPayment.create", () => {
  const base = {
    saleId: "sale-1",
    customerId: "cust-1",
    userId: "user-1",
    branchId: "branch-1",
    paymentMethodId: "pm-1",
    folioId: "folio-1",
    folioNumber: 1,
    folioCode: "RECIBO-000001",
    amount: 300,
    status: "completed" as const,
    notes: null,
    createdAt: new Date(),
    cancelledAt: null,
    cancellationReason: null,
  };

  it("creates a valid payment", () => {
    const p = CustomerPayment.create("id-1", base);
    expect(p.id).toBe("id-1");
    expect(p.amount).toBe(300);
    expect(p.status).toBe("completed");
  });

  it("throws when amount <= 0", () => {
    expect(() => CustomerPayment.create("id-2", { ...base, amount: 0 })).toThrow("amount must be > 0");
    expect(() => CustomerPayment.create("id-3", { ...base, amount: -1 })).toThrow("amount must be > 0");
  });
});
