import { NextRequest } from "next/server";
import { ProductsController } from "@/modules/products/infrastructure/http/ProductsController";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";
import { InMemoryDepartmentRepository } from "@/modules/departments/infrastructure/repositories/InMemoryDepartmentRepository";
import { ListProductsUseCase } from "@/modules/products/application/use-cases/ListProductsUseCase";
import { GetProductUseCase } from "@/modules/products/application/use-cases/GetProductUseCase";
import { CreateProductUseCase } from "@/modules/products/application/use-cases/CreateProductUseCase";
import { UpdateProductUseCase } from "@/modules/products/application/use-cases/UpdateProductUseCase";
import { SoftDeleteProductUseCase } from "@/modules/products/application/use-cases/SoftDeleteProductUseCase";

async function buildController() {
  const productRepo = new InMemoryProductRepository();
  productRepo.reset();
  const deptRepo = new InMemoryDepartmentRepository();
  const dept = await deptRepo.create({ code: "DEPT1", name: "Abarrotes" });
  const ctrl = new ProductsController(
    new ListProductsUseCase(productRepo),
    new GetProductUseCase(productRepo),
    new CreateProductUseCase(productRepo, deptRepo),
    new UpdateProductUseCase(productRepo, deptRepo),
    new SoftDeleteProductUseCase(productRepo)
  );
  return { ctrl, departmentId: dept.id };
}

function makeCreateReq(body: unknown) {
  return new NextRequest("http://localhost/api/v1/admin/products", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeListReq(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/v1/admin/products");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

describe("ProductsController — Zod validation", () => {
  it("rejects an invalid code format", async () => {
    const { ctrl, departmentId } = await buildController();
    const res = await ctrl.create(makeCreateReq({ code: "arroz 001!", name: "Arroz", unit: "kg", departmentId }));
    expect(res.status).toBe(400);
  });

  it("normalizes code to uppercase", async () => {
    const { ctrl, departmentId } = await buildController();
    const res = await ctrl.create(makeCreateReq({ code: "arroz_001", name: "Arroz", unit: "kg", departmentId }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toBe("ARROZ_001");
  });

  it("rejects a non-UUID departmentId", async () => {
    const { ctrl } = await buildController();
    const res = await ctrl.create(makeCreateReq({ code: "P1", name: "Arroz", unit: "kg", departmentId: "not-a-uuid" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/departmentId/i);
  });

  it("rejects an out-of-range ivaRate", async () => {
    const { ctrl, departmentId } = await buildController();
    const res = await ctrl.create(makeCreateReq({ code: "P1", name: "Arroz", unit: "kg", departmentId, ivaRate: 200 }));
    expect(res.status).toBe(400);
  });

  it("normalizes a percentage ivaRate (16) to a decimal (0.16)", async () => {
    const { ctrl, departmentId } = await buildController();
    const res = await ctrl.create(makeCreateReq({ code: "P1", name: "Arroz", unit: "kg", departmentId, ivaRate: 16 }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ivaRate).toBeCloseTo(0.16, 10);
  });

  it("rejects an invalid satProductCode format", async () => {
    const { ctrl, departmentId } = await buildController();
    const res = await ctrl.create(makeCreateReq({ code: "P1", name: "Arroz", unit: "kg", departmentId, satProductCode: "ABC123" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/satProductCode/i);
  });

  it("rejects a search shorter than 2 characters", async () => {
    const { ctrl } = await buildController();
    const res = await ctrl.list(makeListReq({ search: "a" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/search/i);
  });

  it("rejects pageSize over the maximum", async () => {
    const { ctrl } = await buildController();
    const res = await ctrl.list(makeListReq({ pageSize: "200" }));
    expect(res.status).toBe(400);
  });
});
