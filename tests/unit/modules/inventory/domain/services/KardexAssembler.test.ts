import { KardexAssembler } from "@/modules/inventory/domain/services/KardexAssembler";
import { InventoryMovement, InventoryMovementProps } from "@/modules/inventory/domain/entities/InventoryMovement";

const BRANCH_A = "branch-a";
const BRANCH_B = "branch-b";
const PRODUCT_ID = "product-1";

function makeMovement(overrides: Partial<InventoryMovementProps>): InventoryMovement {
  return InventoryMovement.create({
    id: overrides.id ?? "mv-1",
    branchId: overrides.branchId ?? BRANCH_A,
    productId: overrides.productId ?? PRODUCT_ID,
    movementAt: overrides.movementAt ?? new Date("2026-01-01T10:00:00Z"),
    sequence: overrides.sequence ?? 1,
    movementType: overrides.movementType ?? "sale",
    direction: overrides.direction ?? "OUT",
    quantity: overrides.quantity ?? 1,
    unit: overrides.unit ?? "PZA",
    balanceAfter: overrides.balanceAfter ?? 0,
    unitCost: overrides.unitCost ?? null,
    unitPrice: overrides.unitPrice ?? null,
    customerId: overrides.customerId ?? null,
    providerId: overrides.providerId ?? null,
    folioId: overrides.folioId ?? null,
    folioCode: overrides.folioCode ?? null,
    folioNumber: overrides.folioNumber ?? null,
    originFolioCode: overrides.originFolioCode ?? null,
    originFolioNumber: overrides.originFolioNumber ?? null,
    sourceType: overrides.sourceType ?? "sale",
    sourceId: overrides.sourceId ?? "sale-1",
    status: overrides.status ?? "Aplicada",
    notes: overrides.notes ?? null,
    createdBy: overrides.createdBy ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T10:00:00Z"),
  });
}

describe("KardexAssembler", () => {
  it("orders movements chronologically, using sequence as tiebreaker", () => {
    const m1 = makeMovement({ id: "a", movementAt: new Date("2026-01-02T00:00:00Z"), sequence: 1, quantity: 2 });
    const m2 = makeMovement({ id: "b", movementAt: new Date("2026-01-01T00:00:00Z"), sequence: 2, quantity: 3 });
    const m3 = makeMovement({ id: "c", movementAt: new Date("2026-01-01T00:00:00Z"), sequence: 1, quantity: 5 });

    const { movements } = KardexAssembler.assemble({
      branchId: BRANCH_A,
      movements: [m1, m2, m3],
      branchBalances: [{ branchId: BRANCH_A, balanceBeforeRange: 0, lastBalanceInRange: 0, currentQuantity: 0 }],
    });

    expect(movements.map((m) => m.salida)).toEqual([5, 3, 2]);
  });

  it("computes saldoFinal from the last movement's balanceAfter for a single branch", () => {
    const movements = [
      makeMovement({ sequence: 1, direction: "OUT", quantity: 5, balanceAfter: 45 }),
      makeMovement({ sequence: 2, direction: "IN", quantity: 10, balanceAfter: 55 }),
    ];

    const { header } = KardexAssembler.assemble({
      branchId: BRANCH_A,
      movements,
      branchBalances: [
        { branchId: BRANCH_A, balanceBeforeRange: 50, lastBalanceInRange: 55, currentQuantity: 55 },
      ],
    });

    expect(header.saldoAnterior).toBe(50);
    expect(header.saldoFinal).toBe(55);
    expect(header.existenciaAlmacen).toBe(55);
    expect(header.existenciaTotal).toBe(55);
  });

  it("aggregates saldoAnterior/saldoFinal/existencia across branches when branchId is null", () => {
    const { header } = KardexAssembler.assemble({
      branchId: null,
      movements: [],
      branchBalances: [
        { branchId: BRANCH_A, balanceBeforeRange: 50, lastBalanceInRange: 60, currentQuantity: 60 },
        { branchId: BRANCH_B, balanceBeforeRange: 20, lastBalanceInRange: null, currentQuantity: 20 },
      ],
    });

    expect(header.saldoAnterior).toBe(70);
    expect(header.saldoFinal).toBe(80);
    expect(header.existenciaTotal).toBe(80);
  });

  it("returns empty movements and saldoFinal = saldoAnterior for a range with no movements", () => {
    const { movements, header } = KardexAssembler.assemble({
      branchId: BRANCH_A,
      movements: [],
      branchBalances: [
        { branchId: BRANCH_A, balanceBeforeRange: 30, lastBalanceInRange: null, currentQuantity: 30 },
      ],
    });

    expect(movements).toEqual([]);
    expect(header.saldoFinal).toBe(header.saldoAnterior);
    expect(header.saldoFinal).toBe(30);
  });
});
