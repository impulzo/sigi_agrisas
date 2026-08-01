import { toSaleItemDto } from "@/modules/pos/application/mappers/toSaleDto";
import { SaleItem } from "@/modules/pos/domain/entities/SaleItem";

function buildItem(overrides: Partial<Parameters<typeof SaleItem.create>[0]> = {}) {
  return SaleItem.create({
    id: "item-1",
    saleId: "sale-1",
    productId: "product-1",
    productPriceId: "price-1",
    productCodeSnapshot: "SKU-1",
    productNameSnapshot: "Product 1",
    priceNameSnapshot: "Default",
    quantity: 2,
    unitPrice: 100,
    discountPct: 0,
    ivaRate: 0.16,
    iepsRate: 0.08,
    lineSubtotal: 200,
    lineTax: 48,
    lineTotal: 248,
    ...overrides,
  });
}

describe("toSaleItemDto", () => {
  it("derives lineIva and lineIeps from lineSubtotal and rates", () => {
    const dto = toSaleItemDto(buildItem());

    expect(dto.lineIva).toBe(32);
    expect(dto.lineIeps).toBe(16);
    expect(dto.lineTax).toBe(48);
  });

  it("defaults to 0 when ivaRate/iepsRate are null", () => {
    const dto = toSaleItemDto(
      buildItem({ ivaRate: null, iepsRate: null, lineTax: 0, lineTotal: 200 })
    );

    expect(dto.lineIva).toBe(0);
    expect(dto.lineIeps).toBe(0);
  });

  it("rounds to 4 decimals", () => {
    const dto = toSaleItemDto(
      buildItem({ lineSubtotal: 33.333, ivaRate: 0.16, iepsRate: 0 })
    );

    expect(dto.lineIva).toBe(5.3333);
    expect(dto.lineIeps).toBe(0);
  });
});
