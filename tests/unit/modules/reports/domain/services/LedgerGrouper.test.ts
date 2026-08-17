import { groupLedgerBySale } from "@/modules/reports/domain/services/LedgerGrouper";
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

describe("groupLedgerBySale", () => {
  it("agrupa una venta con sus 2 abonos en orden cronológico", () => {
    const raw = [
      sale({ id: "s1", amount: 100 }),
      payment({ id: "p2", saleId: "s1", amount: 20, date: new Date("2026-06-05T10:00:00Z") }),
      payment({ id: "p1", saleId: "s1", amount: 30, date: new Date("2026-06-03T10:00:00Z") }),
    ];
    const built = AccountLedgerBuilder.build(raw);
    const groups = groupLedgerBySale(built, "date");

    expect(groups).toHaveLength(1);
    expect(groups[0].sale?.id).toBe("s1");
    expect(groups[0].payments.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("venta de contado sin abonos → grupo con payments vacío", () => {
    const raw = [sale({ id: "s1", isCredit: false })];
    const built = AccountLedgerBuilder.build(raw);
    const groups = groupLedgerBySale(built, "date");

    expect(groups).toHaveLength(1);
    expect(groups[0].sale?.id).toBe("s1");
    expect(groups[0].payments).toEqual([]);
  });

  it("abono cuya venta no está en movements → grupo huérfano al final", () => {
    const raw = [
      sale({ id: "s1", date: new Date("2026-06-01T10:00:00Z") }),
      payment({ id: "p-orphan", saleId: "s-not-present", date: new Date("2026-06-02T10:00:00Z") }),
    ];
    const built = AccountLedgerBuilder.build(raw);
    const groups = groupLedgerBySale(built, "date");

    expect(groups).toHaveLength(2);
    expect(groups[0].sale?.id).toBe("s1");
    expect(groups[1].sale).toBeNull();
    expect(groups[1].payments.map((p) => p.id)).toEqual(["p-orphan"]);
  });

  it("sin abonos huérfanos no aparece grupo sale:null", () => {
    const raw = [sale({ id: "s1" }), payment({ id: "p1", saleId: "s1" })];
    const built = AccountLedgerBuilder.build(raw);
    const groups = groupLedgerBySale(built, "date");

    expect(groups.every((g) => g.sale !== null)).toBe(true);
  });

  it("sort='invoice' reordena grupos por folioNumber de la venta", () => {
    const raw = [
      sale({ id: "s2", folioNumber: 2, date: new Date("2026-06-01T10:00:00Z") }),
      sale({ id: "s1", folioNumber: 1, date: new Date("2026-06-02T10:00:00Z") }),
    ];
    const built = AccountLedgerBuilder.build(raw);
    const groups = groupLedgerBySale(built, "invoice");

    expect(groups.map((g) => g.sale?.id)).toEqual(["s1", "s2"]);
  });

  it("sort='serie' reordena grupos por folioCode de la venta", () => {
    const raw = [
      sale({ id: "sB", folioCode: "TC", folioNumber: 1, date: new Date("2026-06-01T10:00:00Z") }),
      sale({ id: "sA", folioCode: "TK", folioNumber: 1, date: new Date("2026-06-02T10:00:00Z") }),
    ];
    const built = AccountLedgerBuilder.build(raw);
    const groups = groupLedgerBySale(built, "serie");

    // "TC" < "TK" alfabéticamente — sB (TC) va antes que sA (TK), sin importar la fecha.
    expect(groups.map((g) => g.sale?.id)).toEqual(["sB", "sA"]);
  });

  it("sort='date' conserva el orden de entrada (ya cronológico por AccountLedgerBuilder)", () => {
    const raw = [
      sale({ id: "s2", folioNumber: 2, date: new Date("2026-06-05T10:00:00Z") }),
      sale({ id: "s1", folioNumber: 1, date: new Date("2026-06-01T10:00:00Z") }),
    ];
    const built = AccountLedgerBuilder.build(raw);
    const groups = groupLedgerBySale(built, "date");

    expect(groups.map((g) => g.sale?.id)).toEqual(["s1", "s2"]);
  });

  it("el total de movimientos dentro de los grupos coincide con movements.length", () => {
    const raw = [
      sale({ id: "s1" }),
      sale({ id: "s2", isCredit: false }),
      payment({ id: "p1", saleId: "s1" }),
      payment({ id: "p2", saleId: "s1" }),
      payment({ id: "p-orphan", saleId: "s-not-present" }),
    ];
    const built = AccountLedgerBuilder.build(raw);
    const groups = groupLedgerBySale(built, "date");

    const totalInGroups = groups.reduce((sum, g) => sum + (g.sale ? 1 : 0) + g.payments.length, 0);
    expect(totalInGroups).toBe(built.length);
  });
});
