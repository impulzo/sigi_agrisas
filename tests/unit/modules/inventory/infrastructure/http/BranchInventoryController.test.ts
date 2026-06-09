import { NextRequest } from "next/server";
import { BranchInventoryController } from "@/modules/inventory/infrastructure/http/BranchInventoryController";
import { InMemoryBranchInventoryRepository } from "@/modules/inventory/infrastructure/repositories/InMemoryBranchInventoryRepository";
import { InMemoryBranchRepository } from "@/modules/branches/infrastructure/repositories/InMemoryBranchRepository";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";
import { ListBranchInventoryUseCase } from "@/modules/inventory/application/use-cases/ListBranchInventoryUseCase";
import { GetBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/GetBranchInventoryItemUseCase";
import { CreateBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/CreateBranchInventoryItemUseCase";
import { UpdateBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/UpdateBranchInventoryItemUseCase";
import { AdjustStockUseCase } from "@/modules/inventory/application/use-cases/AdjustStockUseCase";
import { DeleteBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/DeleteBranchInventoryItemUseCase";

const BRANCH_ID = "11111111-1111-1111-1111-111111111111";
const PRODUCT_ID = "22222222-2222-2222-2222-222222222222";

function buildController() {
  const repo = new InMemoryBranchInventoryRepository();
  repo.reset();
  const branchRepo = new InMemoryBranchRepository();
  const productRepo = new InMemoryProductRepository();
  productRepo.reset();
  return new BranchInventoryController(
    new ListBranchInventoryUseCase(repo, branchRepo),
    new GetBranchInventoryItemUseCase(repo),
    new CreateBranchInventoryItemUseCase(repo, branchRepo, productRepo),
    new UpdateBranchInventoryItemUseCase(repo),
    new AdjustStockUseCase(repo),
    new DeleteBranchInventoryItemUseCase(repo)
  );
}

function makeReq(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("BranchInventoryController — Zod validation", () => {
  it("rejects a negative quantity on create", async () => {
    const res = await buildController().create(
      makeReq("http://localhost/inv", { productId: PRODUCT_ID, quantity: -5 }),
      BRANCH_ID
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/quantity/i);
  });

  it("rejects a non-numeric delta on adjust", async () => {
    const res = await buildController().adjust(
      makeReq("http://localhost/inv/adjust", { delta: "lots" }),
      BRANCH_ID,
      PRODUCT_ID
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/delta/i);
  });

  it("rejects a non-UUID branchId", async () => {
    const res = await buildController().create(
      makeReq("http://localhost/inv", { productId: PRODUCT_ID }),
      "not-a-uuid"
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/branch/i);
  });

  it("rejects an empty update body", async () => {
    const res = await buildController().update(
      makeReq("http://localhost/inv", {}),
      BRANCH_ID,
      PRODUCT_ID
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/at least one field/i);
  });
});
