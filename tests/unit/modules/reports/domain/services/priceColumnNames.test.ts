import { priceColumnNames } from "@/modules/reports/domain/services/priceColumnNames";
import { DepartmentPriceListDepartmentDto, DepartmentProductDto } from "@/modules/reports/application/dto/DepartmentPriceListResponseDto";

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

function product(overrides: Partial<DepartmentProductDto> = {}): DepartmentProductDto {
  return {
    productId: "p1",
    code: "P1",
    name: "Producto 1",
    unit: "PZA",
    unitDescription: null,
    stockQuantity: "5",
    ivaRate: null,
    iepsRate: null,
    acquisitionPrice: null,
    prices: [],
    ...overrides,
  };
}

function price(name: string, isDefault = false) {
  return { priceId: `${name}-id`, name, price: "10.00", minQuantity: 1, discountPct: null, isDefault };
}

describe("priceColumnNames", () => {
  it("devuelve [] cuando no hay departamentos", () => {
    expect(priceColumnNames([])).toEqual([]);
  });

  it("deduplica nombres repetidos entre productos y departamentos", () => {
    const departments = [
      dept({
        products: [
          product({ prices: [price("Público"), price("Mayoreo")] }),
          product({ productId: "p2", code: "P2", prices: [price("Público")] }),
        ],
      }),
    ];
    expect(priceColumnNames(departments)).toEqual(["Mayoreo", "Público"]);
  });

  it("ordena alfabéticamente es-MX sin importar el orden de aparición cuando ninguno es default", () => {
    const departments = [
      dept({
        products: [
          product({ prices: [price("Zebra"), price("Ábaco"), price("Melón")] }),
        ],
      }),
    ];
    expect(priceColumnNames(departments)).toEqual(["Ábaco", "Melón", "Zebra"]);
  });

  it("producto sin precios no aporta columnas", () => {
    const departments = [dept({ products: [product({ prices: [] })] })];
    expect(priceColumnNames(departments)).toEqual([]);
  });

  it("el precio marcado isDefault va primero, resto alfabético (caso público, 10, 15, 4)", () => {
    const departments = [
      dept({
        products: [
          product({
            prices: [price("10"), price("15"), price("4"), price("Precio público", true)],
          }),
        ],
      }),
    ];
    expect(priceColumnNames(departments)).toEqual(["Precio público", "10", "15", "4"]);
  });

  it("un nombre marcado isDefault en cualquier producto se considera default en toda la columna", () => {
    const departments = [
      dept({
        products: [
          product({ prices: [price("Mayoreo", false)] }),
          product({ productId: "p2", code: "P2", prices: [price("Mayoreo", true), price("Público", false)] }),
        ],
      }),
    ];
    expect(priceColumnNames(departments)).toEqual(["Mayoreo", "Público"]);
  });
});
