import { groupPaymentsBySale, GroupablePayment } from "../../../../../../../app/(private)/payments/_logic/lib/groupPaymentsBySale";

function makeItem(overrides: Partial<GroupablePayment> = {}): GroupablePayment {
  return {
    id: "pay-1",
    saleId: "sale-1",
    saleFolioCode: "VNT-000001",
    customerName: "Cliente A",
    saleTotal: 1000,
    saleDueAmount: 700,
    salePaymentStatus: "partial",
    ...overrides,
  };
}

describe("groupPaymentsBySale", () => {
  it("returns an empty array for an empty input", () => {
    expect(groupPaymentsBySale([])).toEqual([]);
  });

  it("groups multiple payments of the same ticket into one group", () => {
    const items = [
      makeItem({ id: "pay-1" }),
      makeItem({ id: "pay-2" }),
    ];
    const groups = groupPaymentsBySale(items);

    expect(groups).toHaveLength(1);
    expect(groups[0].saleId).toBe("sale-1");
    expect(groups[0].payments).toHaveLength(2);
    expect(groups[0].saleFolioCode).toBe("VNT-000001");
    expect(groups[0].customerName).toBe("Cliente A");
    expect(groups[0].saleTotal).toBe(1000);
    expect(groups[0].saleDueAmount).toBe(700);
    expect(groups[0].salePaymentStatus).toBe("partial");
  });

  it("preserves first-appearance order across interleaved tickets", () => {
    const items = [
      makeItem({ id: "pay-1", saleId: "sale-1" }),
      makeItem({ id: "pay-2", saleId: "sale-2", saleFolioCode: "VNT-000002" }),
      makeItem({ id: "pay-3", saleId: "sale-1" }),
    ];
    const groups = groupPaymentsBySale(items);

    expect(groups.map((g) => g.saleId)).toEqual(["sale-1", "sale-2"]);
    expect(groups[0].payments.map((p) => p.id)).toEqual(["pay-1", "pay-3"]);
    expect(groups[1].payments.map((p) => p.id)).toEqual(["pay-2"]);
  });

  it("does not crash when two payments of the same sale carry different salePaymentStatus and derives group data from the first item", () => {
    const items = [
      makeItem({ id: "pay-1", salePaymentStatus: "partial" }),
      makeItem({ id: "pay-2", salePaymentStatus: "paid" }),
    ];
    const groups = groupPaymentsBySale(items);

    expect(groups).toHaveLength(1);
    expect(groups[0].salePaymentStatus).toBe("partial");
  });

  it("falls back to empty strings when saleFolioCode/customerName are null", () => {
    const groups = groupPaymentsBySale([makeItem({ saleFolioCode: null, customerName: null })]);
    expect(groups[0].saleFolioCode).toBe("");
    expect(groups[0].customerName).toBe("");
  });
});
