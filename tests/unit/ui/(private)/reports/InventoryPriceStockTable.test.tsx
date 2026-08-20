import { render, screen } from "@testing-library/react";
import { priceColumnNames as backendPriceColumnNames } from "@/modules/reports/domain/services/priceColumnNames";
import { InventoryPriceStockTable, priceColumnNames as uiPriceColumnNames } from "../../../../../app/(private)/reports/_blocks/InventoryPriceStockTable";
import type { DepartmentPriceListDepartmentDto } from "../../../../../app/(private)/reports/inventory/_logic/types/api";

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

function price(name: string, isDefault = false) {
  return { priceId: `${name}-id`, name, price: "10.0000", minQuantity: 1, discountPct: null, isDefault };
}

describe("InventoryPriceStockTable — paridad de priceColumnNames con el backend", () => {
  it("produce el mismo orden que la implementación de src/modules/reports para el caso público/10/15/4", () => {
    const departments = [
      dept({
        products: [
          {
            productId: "p1",
            code: "P1",
            name: "Producto 1",
            unit: "PZA",
            unitDescription: null,
            stockQuantity: "5",
            ivaRate: null,
            iepsRate: null,
            acquisitionPrice: null,
            prices: [price("10"), price("15"), price("4"), price("Precio público", true)],
          },
        ],
      }),
    ];

    expect(uiPriceColumnNames(departments)).toEqual(backendPriceColumnNames(departments));
    expect(uiPriceColumnNames(departments)).toEqual(["Precio público", "10", "15", "4"]);
  });
});

describe("InventoryPriceStockTable — columna de costo de adquisición", () => {
  it("muestra el costo formateado como moneda cuando existe", () => {
    render(
      <InventoryPriceStockTable
        departments={[
          dept({
            products: [
              {
                productId: "p1",
                code: "P1",
                name: "Producto 1",
                unit: "PZA",
                unitDescription: null,
                stockQuantity: "5",
                ivaRate: null,
                iepsRate: null,
                acquisitionPrice: "45.5000",
                prices: [],
              },
            ],
          }),
        ]}
        totals={{ productCount: 1, priceCount: 0, totalStock: "5" }}
      />
    );

    expect(screen.getByText("Costo adq.")).toBeInTheDocument();
    expect(screen.getByText("$45.50")).toBeInTheDocument();
  });

  it("muestra — cuando el producto no tiene costo capturado", () => {
    render(
      <InventoryPriceStockTable
        departments={[
          dept({
            products: [
              {
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
              },
            ],
          }),
        ]}
        totals={{ productCount: 1, priceCount: 0, totalStock: "5" }}
      />
    );

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });
});
