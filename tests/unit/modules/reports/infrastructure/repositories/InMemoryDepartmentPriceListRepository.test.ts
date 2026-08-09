import { Decimal } from "decimal.js";
import { InMemoryDepartmentPriceListRepository } from "@/modules/reports/infrastructure/repositories/InMemoryDepartmentPriceListRepository";
import { RawPriceListRow } from "@/modules/reports/application/ports/DepartmentPriceListRepository";

function makeRow(productId: string, departmentId: string): RawPriceListRow {
  return {
    departmentId,
    departmentCode: "D1",
    departmentName: "Depto 1",
    productId,
    code: "P1",
    name: "Producto",
    unit: "PZA",
    ivaRate: null,
    iepsRate: null,
    priceId: "price-1",
    priceName: "Menudeo",
    price: new Decimal("10.0000"),
    minQuantity: 1,
    discountPct: null,
    isDefault: true,
  };
}

describe("InMemoryDepartmentPriceListRepository", () => {
  it("devuelve todas las filas sin filtro", async () => {
    const repo = new InMemoryDepartmentPriceListRepository([
      makeRow("prod-1", "dept-1"),
      makeRow("prod-2", "dept-2"),
    ]);

    const rows = await repo.findRows({ departmentId: null });

    expect(rows).toHaveLength(2);
  });

  it("filtra por departmentId", async () => {
    const repo = new InMemoryDepartmentPriceListRepository([
      makeRow("prod-1", "dept-1"),
      makeRow("prod-2", "dept-2"),
    ]);

    const rows = await repo.findRows({ departmentId: "dept-2" });

    expect(rows).toHaveLength(1);
    expect(rows[0].productId).toBe("prod-2");
  });
});
