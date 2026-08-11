import { GetSalesByProductReportUseCase } from "@/modules/reports/application/use-cases/GetSalesByProductReportUseCase";
import { InMemorySalesByProductRepository } from "@/modules/reports/infrastructure/repositories/InMemorySalesByProductRepository";
import { SalesByProductAggregates } from "@/modules/reports/domain/value-objects/SalesByProductFilters";

const GEN = { userId: "u1", email: "op@test.com" };
const FROM = new Date("2026-06-01T00:00:00.000Z");
const TO = new Date("2026-06-30T00:00:00.000Z");

const EMPTY: SalesByProductAggregates = {
  totals: { ticketCount: 0, subtotal: 0, taxTotal: 0, total: 0 },
  byCustomer: [],
  byDepartment: [],
  byProduct: [],
};

function base(agg: SalesByProductAggregates) {
  return new GetSalesByProductReportUseCase(new InMemorySalesByProductRepository(() => agg));
}

const req = (over = {}) => ({
  branchId: null, departmentId: null, customerId: null, from: FROM, to: TO, generatedBy: GEN, ...over,
});

describe("GetSalesByProductReportUseCase", () => {
  it("periodo vacío → totales en cero y desgloses vacíos", async () => {
    const dto = await base(EMPTY).execute(req());
    expect(dto.totals).toEqual({ ticketCount: 0, subtotal: "0.0000", taxTotal: "0.0000", total: "0.0000" });
    expect(dto.byCustomer).toHaveLength(0);
    expect(dto.byDepartment).toHaveLength(0);
    expect(dto.byProduct).toHaveLength(0);
  });

  it("expone quantitySold y currentStock por producto (cruce inventario × ventas)", async () => {
    const dto = await base({
      ...EMPTY,
      byProduct: [
        { key: "p1", label: "Fertilizante (F1)", ticketCount: 2, quantitySold: 10, currentStock: 40, subtotal: 100, taxTotal: 16, total: 116 },
      ],
    }).execute(req());

    expect(dto.byProduct[0].quantitySold).toBe("10.0000");
    expect(dto.byProduct[0].currentStock).toBe(40);
    expect(dto.byProduct[0].total).toBe("116.0000");
  });

  it("totals permanece constante independiente del contenido de los desgloses", async () => {
    const dto = await base({
      totals: { ticketCount: 5, subtotal: 500, taxTotal: 80, total: 580 },
      byCustomer: [{ key: "c1", label: "Cliente Uno", ticketCount: 5, subtotal: 500, taxTotal: 80, total: 580 }],
      byDepartment: [],
      byProduct: [],
    }).execute(req());

    expect(dto.totals).toEqual({ ticketCount: 5, subtotal: "500.0000", taxTotal: "80.0000", total: "580.0000" });
  });
});
