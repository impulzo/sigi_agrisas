import { Decimal } from "decimal.js";
import { InMemoryInventoryReportRepository } from "@/modules/reports/infrastructure/repositories/InMemoryInventoryReportRepository";
import { RawStockRow } from "@/modules/reports/application/ports/InventoryReportRepository";

function makeRow(overrides: Partial<RawStockRow> & { branchId: string; productId: string }): RawStockRow {
  return {
    branchId: overrides.branchId,
    branchCode: overrides.branchCode ?? "B1",
    branchName: overrides.branchName ?? "Sucursal 1",
    isHeadquarters: overrides.isHeadquarters ?? false,
    departmentId: overrides.departmentId ?? "dept-1",
    departmentCode: overrides.departmentCode ?? "D1",
    departmentName: overrides.departmentName ?? "Departamento 1",
    productId: overrides.productId,
    code: overrides.code ?? "P001",
    name: overrides.name ?? "Producto 1",
    unit: overrides.unit ?? "PZA",
    quantity: overrides.quantity ?? new Decimal("10"),
    reservedQuantity: overrides.reservedQuantity ?? new Decimal("0"),
    reorderPoint: overrides.reorderPoint ?? new Decimal("5"),
  };
}

describe("InMemoryInventoryReportRepository", () => {
  const rows = [
    makeRow({ branchId: "branch-1", departmentId: "dept-1", productId: "prod-1" }),
    makeRow({ branchId: "branch-1", departmentId: "dept-2", productId: "prod-2" }),
    makeRow({ branchId: "branch-2", departmentId: "dept-1", productId: "prod-3" }),
  ];

  it("sin filtros devuelve todas las filas", async () => {
    const repo = new InMemoryInventoryReportRepository(rows);
    const result = await repo.findStockGrouped({ includeZeroStock: true });
    expect(result).toHaveLength(3);
  });

  it("filtra por branchId", async () => {
    const repo = new InMemoryInventoryReportRepository(rows);
    const result = await repo.findStockGrouped({ branchId: "branch-1", includeZeroStock: true });
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.branchId === "branch-1")).toBe(true);
  });

  it("filtra por departmentId", async () => {
    const repo = new InMemoryInventoryReportRepository(rows);
    const result = await repo.findStockGrouped({ departmentId: "dept-1", includeZeroStock: true });
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.departmentId === "dept-1")).toBe(true);
  });

  it("filtra por branchId y departmentId combinados", async () => {
    const repo = new InMemoryInventoryReportRepository(rows);
    const result = await repo.findStockGrouped({ branchId: "branch-1", departmentId: "dept-1", includeZeroStock: true });
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe("prod-1");
  });

  it("devuelve vacío cuando el filtro no coincide", async () => {
    const repo = new InMemoryInventoryReportRepository(rows);
    const result = await repo.findStockGrouped({ branchId: "branch-999", includeZeroStock: true });
    expect(result).toHaveLength(0);
  });
});
