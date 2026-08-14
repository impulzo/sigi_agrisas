import { GetSalesByProductReportUseCase } from "@/modules/reports/application/use-cases/GetSalesByProductReportUseCase";
import { InMemorySalesByProductRepository } from "@/modules/reports/infrastructure/repositories/InMemorySalesByProductRepository";
import { SalesByProductFilters, SalesByProductPage } from "@/modules/reports/domain/value-objects/SalesByProductFilters";

const GEN = { userId: "u1", email: "op@test.com" };
const FROM = new Date("2026-06-01T00:00:00.000Z");
const TO = new Date("2026-06-30T00:00:00.000Z");

const EMPTY: SalesByProductPage = {
  totals: { ticketCount: 0, subtotal: 0, taxTotal: 0, total: 0 },
  rows: [],
  rowsTotal: 0,
};

function useCase(fixture: (filters: SalesByProductFilters, page: number, pageSize: number) => SalesByProductPage) {
  return new GetSalesByProductReportUseCase(new InMemorySalesByProductRepository(fixture));
}

function base(page: SalesByProductPage) {
  return useCase(() => page);
}

const req = (over = {}) => ({
  branchId: null, departmentId: null, customerId: null,
  from: FROM, to: TO, page: 1, pageSize: 20, forExport: false,
  generatedBy: GEN,
  ...over,
});

describe("GetSalesByProductReportUseCase", () => {
  it("periodo vacío → totales en cero y sin filas", async () => {
    const { dto, tooLarge } = await base(EMPTY).execute(req());
    expect(dto.totals).toEqual({ ticketCount: 0, subtotal: "0.0000", taxTotal: "0.0000", total: "0.0000" });
    expect(dto.rows).toHaveLength(0);
    expect(dto.rowsTotal).toBe(0);
    expect(tooLarge).toBe(false);
  });

  it("mapea correctamente Departamento+Producto+Cliente con cantidad y monto", async () => {
    const { dto } = await base({
      totals: { ticketCount: 2, subtotal: 100, taxTotal: 16, total: 116 },
      rows: [
        {
          departmentId: "d1", departmentName: "Agroquímicos",
          productId: "p1", productCode: "F1", productName: "Fertilizante",
          customerId: "c1", customerName: "Cliente Uno",
          quantity: 10, total: 116,
        },
      ],
      rowsTotal: 1,
    }).execute(req());

    expect(dto.rows[0]).toEqual({
      departmentId: "d1", departmentName: "Agroquímicos",
      productId: "p1", productCode: "F1", productName: "Fertilizante",
      customerId: "c1", customerName: "Cliente Uno",
      quantity: "10.0000", total: "116.0000",
    });
    expect(dto.rowsTotal).toBe(1);
  });

  it("propaga page/pageSize al repositorio cuando no es export", async () => {
    let received: { page: number; pageSize: number } | null = null;
    await useCase((_f, page, pageSize) => {
      received = { page, pageSize };
      return EMPTY;
    }).execute(req({ page: 3, pageSize: 50 }));

    expect(received).toEqual({ page: 3, pageSize: 50 });
  });

  it("forExport=true fuerza page:1, pageSize:10001 sin importar los del request", async () => {
    let received: { page: number; pageSize: number } | null = null;
    await useCase((_f, page, pageSize) => {
      received = { page, pageSize };
      return EMPTY;
    }).execute(req({ page: 3, pageSize: 50, forExport: true }));

    expect(received).toEqual({ page: 1, pageSize: 10001 });
  });

  it("tooLarge=true cuando forExport=true y rowsTotal excede 10000", async () => {
    const { tooLarge } = await base({ ...EMPTY, rowsTotal: 10001 }).execute(req({ forExport: true }));
    expect(tooLarge).toBe(true);
  });

  it("tooLarge=false cuando rowsTotal excede 10000 pero no es export", async () => {
    const { tooLarge } = await base({ ...EMPTY, rowsTotal: 10001 }).execute(req({ forExport: false }));
    expect(tooLarge).toBe(false);
  });

  it("totals se angosta si el repositorio lo hace (comparte customerId con rows/rowsTotal)", async () => {
    const { dto } = await base({
      totals: { ticketCount: 1, subtotal: 50, taxTotal: 8, total: 58 },
      rows: [],
      rowsTotal: 0,
    }).execute(req({ customerId: "c1" }));

    expect(dto.totals).toEqual({ ticketCount: 1, subtotal: "50.0000", taxTotal: "8.0000", total: "58.0000" });
    expect(dto.filters.customerId).toBe("c1");
  });
});
