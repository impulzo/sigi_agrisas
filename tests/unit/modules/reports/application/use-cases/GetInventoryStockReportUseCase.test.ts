import { Decimal } from "decimal.js";
import { GetInventoryStockReportUseCase } from "@/modules/reports/application/use-cases/GetInventoryStockReportUseCase";
import { InMemoryInventoryReportRepository } from "@/modules/reports/infrastructure/repositories/InMemoryInventoryReportRepository";
import { RawStockRow } from "@/modules/reports/application/ports/InventoryReportRepository";

const GENERATED_BY = { userId: "user-1", email: "admin@test.com" };

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
    quantity: overrides.quantity ?? new Decimal("10.0000"),
    reservedQuantity: overrides.reservedQuantity ?? new Decimal("0.0000"),
    reorderPoint: overrides.reorderPoint ?? new Decimal("5.0000"),
  };
}

describe("GetInventoryStockReportUseCase", () => {
  it("agrega correctamente 1 sucursal × 1 depto × N productos", async () => {
    const rows = [
      makeRow({ branchId: "branch-1", productId: "prod-1", quantity: new Decimal("10") }),
      makeRow({ branchId: "branch-1", productId: "prod-2", quantity: new Decimal("20") }),
    ];
    const repo = new InMemoryInventoryReportRepository(rows);
    const uc = new GetInventoryStockReportUseCase(repo);

    const dto = await uc.execute({ includeZeroStock: true, generatedBy: GENERATED_BY });

    expect(dto.branches).toHaveLength(1);
    expect(dto.branches[0].departments).toHaveLength(1);
    expect(dto.branches[0].departments[0].products).toHaveLength(2);
    expect(dto.totals.productCount).toBe(2);
    expect(dto.totals.totalQuantity).toBe("30.0000");
  });

  it("agrupa múltiples sucursales y departamentos", async () => {
    const rows = [
      makeRow({ branchId: "branch-1", departmentId: "dept-1", productId: "prod-1" }),
      makeRow({ branchId: "branch-1", departmentId: "dept-2", productId: "prod-2", departmentCode: "D2", departmentName: "Depto 2" }),
      makeRow({ branchId: "branch-2", departmentId: "dept-1", productId: "prod-3", branchCode: "B2", branchName: "Sucursal 2" }),
    ];
    const repo = new InMemoryInventoryReportRepository(rows);
    const uc = new GetInventoryStockReportUseCase(repo);

    const dto = await uc.execute({ includeZeroStock: true, generatedBy: GENERATED_BY });

    expect(dto.branches).toHaveLength(2);
    expect(dto.totals.branchCount).toBe(2);
    expect(dto.totals.departmentCount).toBe(3);
    expect(dto.totals.productCount).toBe(3);
  });

  it("includeZeroStock=false excluye productos con cantidad 0", async () => {
    const rows = [
      makeRow({ branchId: "branch-1", productId: "prod-1", quantity: new Decimal("5") }),
      makeRow({ branchId: "branch-1", productId: "prod-2", quantity: new Decimal("0") }),
    ];
    const repo = new InMemoryInventoryReportRepository(rows);
    const uc = new GetInventoryStockReportUseCase(repo);

    const dto = await uc.execute({ includeZeroStock: false, generatedBy: GENERATED_BY });

    expect(dto.branches[0].departments[0].products).toHaveLength(1);
    expect(dto.totals.productCount).toBe(1);
  });

  it("includeZeroStock=false elimina depts y sucursales que quedan vacíos", async () => {
    const rows = [
      makeRow({ branchId: "branch-1", productId: "prod-1", quantity: new Decimal("0") }),
    ];
    const repo = new InMemoryInventoryReportRepository(rows);
    const uc = new GetInventoryStockReportUseCase(repo);

    const dto = await uc.execute({ includeZeroStock: false, generatedBy: GENERATED_BY });

    expect(dto.branches).toHaveLength(0);
    expect(dto.totals.productCount).toBe(0);
  });

  it("producto con cantidad negativa se incluye e isBelowReorder es true", async () => {
    const rows = [
      makeRow({ branchId: "branch-1", productId: "prod-1", quantity: new Decimal("-2"), reorderPoint: new Decimal("5") }),
    ];
    const repo = new InMemoryInventoryReportRepository(rows);
    const uc = new GetInventoryStockReportUseCase(repo);

    const dto = await uc.execute({ includeZeroStock: true, generatedBy: GENERATED_BY });

    const product = dto.branches[0].departments[0].products[0];
    expect(product.quantity).toBe("-2.0000");
    expect(product.isBelowReorder).toBe(true);
  });

  it("branches: [] con totales en cero cuando no hay filas", async () => {
    const repo = new InMemoryInventoryReportRepository([]);
    const uc = new GetInventoryStockReportUseCase(repo);

    const dto = await uc.execute({ includeZeroStock: true, generatedBy: GENERATED_BY });

    expect(dto.branches).toHaveLength(0);
    expect(dto.totals.branchCount).toBe(0);
    expect(dto.totals.productCount).toBe(0);
    expect(dto.totals.totalQuantity).toBe("0.0000");
  });

  it("calcula availableQuantity = quantity - reservedQuantity", async () => {
    const rows = [
      makeRow({ branchId: "branch-1", productId: "prod-1", quantity: new Decimal("20"), reservedQuantity: new Decimal("5") }),
    ];
    const repo = new InMemoryInventoryReportRepository(rows);
    const uc = new GetInventoryStockReportUseCase(repo);

    const dto = await uc.execute({ includeZeroStock: true, generatedBy: GENERATED_BY });

    const product = dto.branches[0].departments[0].products[0];
    expect(product.availableQuantity).toBe("15.0000");
  });

  it("subtotales y totales son consistentes", async () => {
    const rows = [
      makeRow({ branchId: "branch-1", productId: "prod-1", quantity: new Decimal("10") }),
      makeRow({ branchId: "branch-1", productId: "prod-2", quantity: new Decimal("15") }),
    ];
    const repo = new InMemoryInventoryReportRepository(rows);
    const uc = new GetInventoryStockReportUseCase(repo);

    const dto = await uc.execute({ includeZeroStock: true, generatedBy: GENERATED_BY });

    expect(dto.branches[0].subtotal.totalQuantity).toBe("25.0000");
    expect(dto.totals.totalQuantity).toBe("25.0000");
  });
});
