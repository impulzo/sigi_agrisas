import { Decimal } from "decimal.js";
import { GetDepartmentPriceListReportUseCase } from "@/modules/reports/application/use-cases/GetDepartmentPriceListReportUseCase";
import { InMemoryDepartmentPriceListRepository } from "@/modules/reports/infrastructure/repositories/InMemoryDepartmentPriceListRepository";
import { RawPriceListRow } from "@/modules/reports/application/ports/DepartmentPriceListRepository";

const GENERATED_BY = { userId: "user-1", email: "admin@test.com" };

function makeRow(overrides: Partial<RawPriceListRow> & { productId: string }): RawPriceListRow {
  return {
    departmentId: overrides.departmentId ?? "dept-1",
    departmentCode: overrides.departmentCode ?? "D1",
    departmentName: overrides.departmentName ?? "Departamento 1",
    productId: overrides.productId,
    code: overrides.code ?? "P001",
    name: overrides.name ?? "Producto 1",
    unit: overrides.unit ?? "PZA",
    stockQuantity: overrides.stockQuantity ?? new Decimal("0.0000"),
    ivaRate: overrides.ivaRate !== undefined ? overrides.ivaRate : new Decimal("0.1600"),
    iepsRate: overrides.iepsRate !== undefined ? overrides.iepsRate : null,
    priceId: overrides.priceId !== undefined ? overrides.priceId : "price-1",
    priceName: overrides.priceName !== undefined ? overrides.priceName : "Menudeo",
    price: overrides.price !== undefined ? overrides.price : new Decimal("100.0000"),
    minQuantity: overrides.minQuantity ?? 1,
    discountPct: overrides.discountPct !== undefined ? overrides.discountPct : new Decimal("0.00"),
    isDefault: overrides.isDefault ?? true,
  };
}

describe("GetDepartmentPriceListReportUseCase", () => {
  it("agrupa departamento → producto → precios", async () => {
    const rows = [
      makeRow({ productId: "prod-1" }),
      makeRow({ productId: "prod-1", priceId: "price-2", priceName: "Mayoreo", price: new Decimal("90.0000"), isDefault: false }),
      makeRow({ productId: "prod-2", priceId: "price-3", priceName: "Menudeo" }),
    ];
    const uc = new GetDepartmentPriceListReportUseCase(new InMemoryDepartmentPriceListRepository(rows));

    const dto = await uc.execute({ departmentId: null, generatedBy: GENERATED_BY });

    expect(dto.departments).toHaveLength(1);
    expect(dto.departments[0].products).toHaveLength(2);
    expect(dto.departments[0].products[0].prices).toHaveLength(2);
    expect(dto.departments[0].products[1].prices).toHaveLength(1);
    expect(dto.totals.productCount).toBe(2);
    expect(dto.totals.priceCount).toBe(3);
  });

  it("filtra por departmentId", async () => {
    const rows = [
      makeRow({ departmentId: "dept-1", departmentCode: "D1", departmentName: "Depto 1", productId: "prod-1" }),
      makeRow({ departmentId: "dept-2", departmentCode: "D2", departmentName: "Depto 2", productId: "prod-2" }),
    ];
    const uc = new GetDepartmentPriceListReportUseCase(new InMemoryDepartmentPriceListRepository(rows));

    const dto = await uc.execute({ departmentId: "dept-2", generatedBy: GENERATED_BY });

    expect(dto.departments).toHaveLength(1);
    expect(dto.departments[0].departmentId).toBe("dept-2");
    expect(dto.filters.departmentId).toBe("dept-2");
    expect(dto.totals.departmentCount).toBe(1);
  });

  it("incluye producto sin listas de precio con prices: [] y no suma a priceCount", async () => {
    const rows = [
      makeRow({ productId: "prod-1" }),
      makeRow({ productId: "prod-2", priceId: null, priceName: null, price: null, isDefault: false }),
    ];
    const uc = new GetDepartmentPriceListReportUseCase(new InMemoryDepartmentPriceListRepository(rows));

    const dto = await uc.execute({ departmentId: null, generatedBy: GENERATED_BY });

    const products = dto.departments[0].products;
    expect(products).toHaveLength(2);
    expect(products.find((p) => p.productId === "prod-2")?.prices).toEqual([]);
    expect(dto.totals.priceCount).toBe(1);
  });

  it("serializa Decimal nullable como null y descuento con 2 decimales", async () => {
    const rows = [
      makeRow({ productId: "prod-1", ivaRate: null, iepsRate: new Decimal("0.0800"), discountPct: new Decimal("10.00") }),
    ];
    const uc = new GetDepartmentPriceListReportUseCase(new InMemoryDepartmentPriceListRepository(rows));

    const dto = await uc.execute({ departmentId: null, generatedBy: GENERATED_BY });

    const product = dto.departments[0].products[0];
    expect(product.ivaRate).toBeNull();
    expect(product.iepsRate).toBe("0.0800");
    const price = product.prices[0];
    expect(price.price).toBe("100.0000");
    expect(price.discountPct).toBe("10.00");
  });

  it("calcula subtotales y totales consistentes", async () => {
    const rows = [
      makeRow({ departmentId: "dept-1", productId: "prod-1", stockQuantity: new Decimal("10.0000") }),
      makeRow({
        departmentId: "dept-1",
        productId: "prod-1",
        priceId: "p2",
        priceName: "Mayoreo",
        isDefault: false,
        stockQuantity: new Decimal("10.0000"),
      }),
      makeRow({ departmentId: "dept-1", productId: "prod-2", stockQuantity: new Decimal("5.0000") }),
      makeRow({
        departmentId: "dept-2",
        departmentCode: "D2",
        departmentName: "Depto 2",
        productId: "prod-3",
        stockQuantity: new Decimal("2.5000"),
      }),
    ];
    const uc = new GetDepartmentPriceListReportUseCase(new InMemoryDepartmentPriceListRepository(rows));

    const dto = await uc.execute({ departmentId: null, generatedBy: GENERATED_BY });

    expect(dto.departments[0].subtotal).toEqual({ productCount: 2, priceCount: 3, totalStock: "15.0000" });
    expect(dto.departments[1].subtotal).toEqual({ productCount: 1, priceCount: 1, totalStock: "2.5000" });
    expect(dto.totals).toEqual({
      departmentCount: 2,
      productCount: 3,
      priceCount: 4,
      totalStock: "17.5000",
    });
  });

  it("propaga stockQuantity por producto y branchId en filters", async () => {
    const rows = [makeRow({ productId: "prod-1", stockQuantity: new Decimal("42.0000") })];
    const uc = new GetDepartmentPriceListReportUseCase(new InMemoryDepartmentPriceListRepository(rows));

    const dto = await uc.execute({ departmentId: null, branchId: "branch-1", generatedBy: GENERATED_BY });

    expect(dto.departments[0].products[0].stockQuantity).toBe("42.0000");
    expect(dto.filters.branchId).toBe("branch-1");
  });

  it("devuelve departments vacíos con totales en cero sin filas", async () => {
    const uc = new GetDepartmentPriceListReportUseCase(new InMemoryDepartmentPriceListRepository([]));

    const dto = await uc.execute({ departmentId: null, generatedBy: GENERATED_BY });

    expect(dto.departments).toEqual([]);
    expect(dto.totals).toEqual({
      departmentCount: 0,
      productCount: 0,
      priceCount: 0,
      totalStock: "0.0000",
    });
  });
});
