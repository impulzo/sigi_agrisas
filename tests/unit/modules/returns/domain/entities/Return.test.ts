import { Return } from "@/modules/returns/domain/entities/Return";

const BASE_PROPS = {
  saleId: "sale-1",
  branchId: "branch-1",
  customerId: "customer-1",
  creatorId: "00000000-0000-0000-0000-000000000001",
  reason: "Producto dañado",
  returnedAt: new Date("2026-06-01T10:00:00Z"),
  notes: null,
  cancelledAt: null,
  cancelledBy: null,
  cancellationReason: null,
};

describe("Return.create", () => {
  it("initializes with default status='completed'", () => {
    const ret = Return.create(BASE_PROPS);
    expect(ret.status).toBe("completed");
  });

  it("initializes refund totals to 0 when not provided", () => {
    const ret = Return.create(BASE_PROPS);
    expect(ret.refundSubtotal).toBe(0);
    expect(ret.refundTax).toBe(0);
    expect(ret.refundTotal).toBe(0);
  });

  it("stores provided refund values", () => {
    const ret = Return.create({
      ...BASE_PROPS,
      refundSubtotal: 100,
      refundTax: 16,
      refundTotal: 116,
    });
    expect(ret.refundSubtotal).toBe(100);
    expect(ret.refundTax).toBe(16);
    expect(ret.refundTotal).toBe(116);
  });

  it("generates a UUID id when not provided", () => {
    const ret = Return.create(BASE_PROPS);
    expect(ret.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("uses provided id", () => {
    const id = "00000000-0000-0000-0000-000000000099";
    const ret = Return.create({ ...BASE_PROPS, id });
    expect(ret.id).toBe(id);
  });

  it("stores all provided props as readonly", () => {
    const ret = Return.create(BASE_PROPS);
    expect(ret.saleId).toBe("sale-1");
    expect(ret.branchId).toBe("branch-1");
    expect(ret.customerId).toBe("customer-1");
    expect(ret.creatorId).toBe("00000000-0000-0000-0000-000000000001");
    expect(ret.reason).toBe("Producto dañado");
    expect(ret.notes).toBeNull();
    expect(ret.cancelledAt).toBeNull();
    expect(ret.cancelledBy).toBeNull();
    expect(ret.cancellationReason).toBeNull();
  });
});

describe("Return.canBeCancelled", () => {
  it("returns true when status is completed", () => {
    const ret = Return.create({ ...BASE_PROPS, status: "completed" });
    expect(ret.canBeCancelled()).toBe(true);
  });

  it("returns false when status is cancelled", () => {
    const ret = Return.create({
      ...BASE_PROPS,
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledBy: "00000000-0000-0000-0000-000000000002",
    });
    expect(ret.canBeCancelled()).toBe(false);
  });
});
