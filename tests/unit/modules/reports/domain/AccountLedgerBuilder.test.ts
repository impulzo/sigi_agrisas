import { AccountLedgerBuilder } from "@/modules/reports/domain/services/AccountLedgerBuilder";
import { RawAccountMovement } from "@/modules/reports/domain/value-objects/AccountMovement";

function sale(over: Partial<RawAccountMovement> = {}): RawAccountMovement {
  return {
    id: "s",
    kind: "sale",
    isCredit: true,
    status: "completed",
    amount: 100,
    date: new Date("2026-06-01T10:00:00Z"),
    folioCode: "TK",
    folioNumber: 1,
    branchId: "b1",
    dueDate: null,
    reference: null,
    paymentMethodCode: "CR",
    paymentStatus: "pending",
    saleId: null,
    ...over,
  };
}

function payment(over: Partial<RawAccountMovement> = {}): RawAccountMovement {
  return {
    id: "p",
    kind: "payment",
    isCredit: false,
    status: "completed",
    amount: 40,
    date: new Date("2026-06-02T10:00:00Z"),
    folioCode: "RB",
    folioNumber: 1,
    branchId: "b1",
    dueDate: null,
    reference: null,
    paymentMethodCode: "TR",
    paymentStatus: null,
    saleId: "s",
    ...over,
  };
}

describe("AccountLedgerBuilder", () => {
  it("credit sale debits, payment credits — running balance", () => {
    const out = AccountLedgerBuilder.build([sale({ amount: 100 }), payment({ amount: 40 })], 0);
    expect(out[0].type).toBe("sale_credit");
    expect(out[0].debit).toBe(100);
    expect(out[0].runningBalance).toBe(100);
    expect(out[1].type).toBe("payment");
    expect(out[1].credit).toBe(40);
    expect(out[1].runningBalance).toBe(60);
  });

  it("cash sale does not move balance", () => {
    const out = AccountLedgerBuilder.build([sale({ isCredit: false, amount: 100 })], 0);
    expect(out[0].type).toBe("sale_cash");
    expect(out[0].debit).toBe(0);
    expect(out[0].credit).toBe(0);
    expect(out[0].runningBalance).toBe(0);
  });

  it("cancelled credit sale does not move balance", () => {
    const out = AccountLedgerBuilder.build([sale({ status: "cancelled", amount: 100 })], 0);
    expect(out[0].debit).toBe(0);
    expect(out[0].runningBalance).toBe(0);
  });

  it("cancelled payment does not move balance", () => {
    const out = AccountLedgerBuilder.build(
      [sale({ amount: 100 }), payment({ status: "cancelled", amount: 40 })],
      0
    );
    expect(out[1].credit).toBe(0);
    expect(out[1].runningBalance).toBe(100);
  });

  it("opening balance seeds the running balance", () => {
    const out = AccountLedgerBuilder.build([payment({ amount: 30 })], 250);
    expect(out[0].runningBalance).toBe(220);
  });

  it("sorts by date; sale before payment on tie", () => {
    const sameDate = new Date("2026-06-05T10:00:00Z");
    const out = AccountLedgerBuilder.build(
      [
        payment({ id: "p1", amount: 10, date: sameDate }),
        sale({ id: "s1", amount: 100, date: sameDate }),
      ],
      0
    );
    expect(out[0].id).toBe("s1");
    expect(out[1].id).toBe("p1");
  });

  it("closingBalance returns opening when empty", () => {
    expect(AccountLedgerBuilder.closingBalance([], 42)).toBe(42);
  });

  it("no float drift on 4-decimal values", () => {
    const out = AccountLedgerBuilder.build(
      [sale({ amount: 0.1 }), sale({ id: "s2", amount: 0.2, date: new Date("2026-06-03T10:00:00Z") })],
      0
    );
    expect(out[1].runningBalance).toBe(0.3);
  });

  it("rounds ties to even at the 5th decimal (banker's rounding)", () => {
    // 5th decimal digit 1 is odd, half-to-even rounds it up to 2 (even).
    const up = AccountLedgerBuilder.build([sale({ amount: 100.00015 })], 0);
    expect(up[0].debit).toBe(100.0002);
    expect(up[0].runningBalance).toBe(100.0002);

    // 5th decimal digit 2 is already even, half-to-even leaves it unchanged.
    const stays = AccountLedgerBuilder.build([sale({ amount: 100.00025 })], 0);
    expect(stays[0].debit).toBe(100.0002);
    expect(stays[0].runningBalance).toBe(100.0002);
  });
});
