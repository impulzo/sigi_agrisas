import { NextRequest } from "next/server";
import { ProductPricesController } from "@/modules/products/infrastructure/http/ProductPricesController";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";
import { InMemoryProductPriceRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductPriceRepository";
import { ListProductPricesUseCase } from "@/modules/products/application/use-cases/ListProductPricesUseCase";
import { CreateProductPriceUseCase } from "@/modules/products/application/use-cases/CreateProductPriceUseCase";
import { UpdateProductPriceUseCase } from "@/modules/products/application/use-cases/UpdateProductPriceUseCase";
import { DeleteProductPriceUseCase } from "@/modules/products/application/use-cases/DeleteProductPriceUseCase";

const PRODUCT_ID = "11111111-1111-1111-1111-111111111111";
const PRICE_ID = "22222222-2222-2222-2222-222222222222";

function buildController() {
  const productRepo = new InMemoryProductRepository();
  productRepo.reset();
  const priceRepo = new InMemoryProductPriceRepository();
  priceRepo.reset();
  return new ProductPricesController(
    new ListProductPricesUseCase(productRepo, priceRepo),
    new CreateProductPriceUseCase(productRepo, priceRepo),
    new UpdateProductPriceUseCase(priceRepo),
    new DeleteProductPriceUseCase(priceRepo)
  );
}

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/v1/admin/products/x/prices", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("ProductPricesController — Zod validation", () => {
  it("rejects a negative price", async () => {
    const res = await buildController().create(makeReq({ name: "Menudeo", price: -5 }), PRODUCT_ID);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/price/i);
  });

  it("rejects minQuantity below 1", async () => {
    const res = await buildController().create(makeReq({ name: "Menudeo", price: 10, minQuantity: 0 }), PRODUCT_ID);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/minQuantity/i);
  });

  it("rejects discountPct over 100", async () => {
    const res = await buildController().create(makeReq({ name: "Menudeo", price: 10, discountPct: 150 }), PRODUCT_ID);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/discountPct/i);
  });

  it("rejects an empty update body", async () => {
    const res = await buildController().update(makeReq({}), PRODUCT_ID, PRICE_ID);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/at least one field/i);
  });
});
