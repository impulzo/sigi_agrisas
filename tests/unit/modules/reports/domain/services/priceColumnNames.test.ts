import { priceColumnNames } from "@/modules/reports/domain/services/priceColumnNames";
import { DepartmentPriceListDepartmentDto } from "@/modules/reports/application/dto/DepartmentPriceListResponseDto";

function dept(overrides: Partial<DepartmentPriceListDepartmentDto> = {}): DepartmentPriceListDepartmentDto {
  return {
    departmentId: "d1",
    departmentCode: "DEPT1",
    departmentName: "Departamento 1",
    products: [],
    subtotal: { productCount: 0, priceCount: 0, totalStock: "0" },
    ...overrides,
  };
}

function price(name: string) {
  return { priceId: `${name}-id`, name, price: "10.00", minQuantity: 1, discountPct: null, isDefault: false };
}

describe("priceColumnNames", () => {
  it("devuelve [] cuando no hay departamentos", () => {
    expect(priceColumnNames([])).toEqual([]);
  });

  it("deduplica nombres repetidos entre productos y departamentos", () => {
    const departments = [
      dept({
        products: [
          { productId: "p1", code: "P1", name: "Producto 1", unit: "PZA", unitDescription: null, stockQuantity: "5", ivaRate: null, iepsRate: null, prices: [price("Público"), price("Mayoreo")] },
          { productId: "p2", code: "P2", name: "Producto 2", unit: "PZA", unitDescription: null, stockQuantity: "3", ivaRate: null, iepsRate: null, prices: [price("Público")] },
        ],
      }),
    ];
    expect(priceColumnNames(departments)).toEqual(["Mayoreo", "Público"]);
  });

  it("ordena alfabéticamente es-MX sin importar el orden de aparición", () => {
    const departments = [
      dept({
        products: [
          { productId: "p1", code: "P1", name: "Producto 1", unit: "PZA", unitDescription: null, stockQuantity: "5", ivaRate: null, iepsRate: null, prices: [price("Zebra"), price("Ábaco"), price("Melón")] },
        ],
      }),
    ];
    expect(priceColumnNames(departments)).toEqual(["Ábaco", "Melón", "Zebra"]);
  });

  it("producto sin precios no aporta columnas", () => {
    const departments = [
      dept({
        products: [
          { productId: "p1", code: "P1", name: "Producto 1", unit: "PZA", unitDescription: null, stockQuantity: "5", ivaRate: null, iepsRate: null, prices: [] },
        ],
      }),
    ];
    expect(priceColumnNames(departments)).toEqual([]);
  });
});
