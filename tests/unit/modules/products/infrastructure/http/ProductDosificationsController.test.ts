import { NextRequest } from "next/server";
import { ProductDosificationsController } from "@/modules/products/infrastructure/http/ProductDosificationsController";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";
import { InMemoryProductPriceRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductPriceRepository";
import { InMemoryProductDosificationRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductDosificationRepository";
import { ListProductDosificationsUseCase } from "@/modules/products/application/use-cases/ListProductDosificationsUseCase";
import { CreateProductDosificationUseCase } from "@/modules/products/application/use-cases/CreateProductDosificationUseCase";
import { UpdateProductDosificationUseCase } from "@/modules/products/application/use-cases/UpdateProductDosificationUseCase";
import { SoftDeleteProductDosificationUseCase } from "@/modules/products/application/use-cases/SoftDeleteProductDosificationUseCase";

const PRODUCT_ID = "11111111-1111-1111-1111-111111111111";

function buildController() {
  const productRepo = new InMemoryProductRepository();
  productRepo.reset();
  const priceRepo = new InMemoryProductPriceRepository();
  priceRepo.reset();
  const dosificationRepo = new InMemoryProductDosificationRepository();
  dosificationRepo.reset();
  return new ProductDosificationsController(
    new ListProductDosificationsUseCase(productRepo, priceRepo, dosificationRepo),
    new CreateProductDosificationUseCase(productRepo, priceRepo, dosificationRepo),
    new UpdateProductDosificationUseCase(priceRepo, dosificationRepo),
    new SoftDeleteProductDosificationUseCase(dosificationRepo)
  );
}

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/v1/admin/products/x/dosifications", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("ProductDosificationsController — Zod validation", () => {
  it("rejects numParts below 2", async () => {
    const res = await buildController().create(makeReq({ name: "Por dosis", numParts: 1 }), PRODUCT_ID);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/numParts/i);
  });

  it("rejects an empty name", async () => {
    const res = await buildController().create(makeReq({ name: "", numParts: 10 }), PRODUCT_ID);
    expect(res.status).toBe(400);
  });
});
