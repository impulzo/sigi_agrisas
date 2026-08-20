jest.mock("@/modules/rbac/infrastructure/di/container", () => ({
  rbacContainer: {
    authorizationService: {
      userCan: jest.fn().mockResolvedValue(false),
      listUserPermissions: jest.fn().mockResolvedValue([]),
      invalidate: jest.fn(),
      invalidateByRole: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

import { NextRequest } from "next/server";
import { WaybillsController } from "@/modules/waybills/infrastructure/http/WaybillsController";
import { CreateWaybillUseCase } from "@/modules/waybills/application/use-cases/CreateWaybillUseCase";
import { CancelWaybillUseCase } from "@/modules/waybills/application/use-cases/CancelWaybillUseCase";
import { ListWaybillsUseCase } from "@/modules/waybills/application/use-cases/ListWaybillsUseCase";
import { GetWaybillUseCase } from "@/modules/waybills/application/use-cases/GetWaybillUseCase";
import { DownloadWaybillFileUseCase } from "@/modules/waybills/application/use-cases/DownloadWaybillFileUseCase";
import { InMemoryWaybillRepository } from "@/modules/waybills/infrastructure/repositories/InMemoryWaybillRepository";
import { InMemoryVehicleRepository } from "@/modules/vehicles/infrastructure/repositories/InMemoryVehicleRepository";
import { InMemoryDriverRepository } from "@/modules/drivers/infrastructure/repositories/InMemoryDriverRepository";
import {
  WaybillFacturamaGateway,
  StampTrasladoInput,
  StampTrasladoResult,
  WaybillCancelResult,
  WaybillDownloadResult,
} from "@/modules/waybills/application/ports/WaybillFacturamaGateway";
import {
  WaybillLookupService,
  BranchForWaybill,
  CustomerForWaybill,
  ProductForWaybill,
  FolioForWaybill,
  SaleForWaybill,
} from "@/modules/waybills/application/ports/WaybillLookupService";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";

const ORIGIN_BRANCH = "11111111-1111-1111-1111-111111111111";
const DEST_BRANCH = "22222222-2222-2222-2222-222222222222";
const OTHER_BRANCH = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PRODUCT_ID = "33333333-3333-3333-3333-333333333333";
const USER_ID = "00000000-0000-0000-0000-000000000001";

function completeBranch(id: string): BranchForWaybill {
  return {
    id,
    name: "Sucursal",
    isActive: true,
    addressStreet: "Calle 1",
    addressExteriorNumber: "100",
    addressInteriorNumber: null,
    addressNeighborhood: "Centro",
    addressMunicipality: "Hermosillo",
    addressState: "SON",
    addressCountry: "MEX",
    addressZipCode: "83000",
  };
}

class FakeLookupService implements WaybillLookupService {
  branches = new Map<string, BranchForWaybill>([
    [ORIGIN_BRANCH, completeBranch(ORIGIN_BRANCH)],
    [DEST_BRANCH, completeBranch(DEST_BRANCH)],
  ]);
  products = new Map<string, ProductForWaybill>([
    [PRODUCT_ID, { id: PRODUCT_ID, code: "FERT01", name: "Fertilizante", isActive: true }],
  ]);
  async findBranch(branchId: string): Promise<BranchForWaybill | null> {
    return this.branches.get(branchId) ?? null;
  }
  async findProduct(productId: string): Promise<ProductForWaybill | null> {
    return this.products.get(productId) ?? null;
  }
  async findFolioByCode(): Promise<FolioForWaybill | null> {
    return { id: "folio-tri", isActive: true };
  }
  async findSale(_saleId: string): Promise<SaleForWaybill | null> {
    return null;
  }
  async findCustomer(_customerId: string): Promise<CustomerForWaybill | null> {
    return null;
  }
}

class FakeGateway implements WaybillFacturamaGateway {
  async stampTraslado(_input: StampTrasladoInput): Promise<StampTrasladoResult> {
    return { cfdiId: "cfdi-1", uuid: "UUID-1" };
  }
  async cancel(): Promise<WaybillCancelResult> {
    return { success: true };
  }
  async download(): Promise<WaybillDownloadResult> {
    return { contentBase64: "ZmFrZQ==", contentType: "application/pdf" };
  }
}

function makeAuthz(hasBranchAccessAll: boolean): AuthorizationService {
  return {
    userCan: jest.fn().mockImplementation((_userId: string, key: string) => {
      if (key === "branches:access_all") return Promise.resolve(hasBranchAccessAll);
      return Promise.resolve(true); // any waybills:* permission granted
    }),
    listUserPermissions: jest.fn().mockResolvedValue([]),
    invalidate: jest.fn(),
    invalidateByRole: jest.fn().mockResolvedValue(undefined),
  };
}

function buildController(hasBranchAccessAll: boolean) {
  const repo = new InMemoryWaybillRepository();
  const gateway = new FakeGateway();
  const lookup = new FakeLookupService();
  const controller = new WaybillsController(
    new CreateWaybillUseCase(repo, gateway, lookup, new InMemoryVehicleRepository(), new InMemoryDriverRepository()),
    new CancelWaybillUseCase(repo, gateway),
    new ListWaybillsUseCase(repo),
    new GetWaybillUseCase(repo),
    new DownloadWaybillFileUseCase(repo, gateway),
    makeAuthz(hasBranchAccessAll)
  );
  return { controller, repo };
}

function req(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-user-id": USER_ID,
      "x-user-branch-id": ORIGIN_BRANCH,
      ...headers,
    },
  });
}

// type='simple' — post-refactor, only this type still has a real destination branch
// (carta_porte's destination is now a customer). This body exercises the same
// origin/destination branch-scoping logic, on the type that still applies to.
const createBody = {
  type: "simple",
  originBranchId: ORIGIN_BRANCH,
  destinationBranchId: DEST_BRANCH,
  transferDate: "2026-08-01T08:00:00.000Z",
  items: [{ productId: PRODUCT_ID, description: "Fertilizante", quantity: 10 }],
};

async function seedWaybill(controller: WaybillsController, repo: InMemoryWaybillRepository) {
  repo.setStock(ORIGIN_BRANCH, PRODUCT_ID, 100);
  const res = await controller.create(req("POST", "/waybills", createBody));
  expect(res.status).toBe(201);
  return (await res.json()).id as string;
}

describe("WaybillsController branch scoping", () => {
  it("getById: 200 when caller's branch is the destination (not origin)", async () => {
    const { controller, repo } = buildController(false);
    const id = await seedWaybill(controller, repo);

    const res = await controller.getById(req("GET", `/waybills/${id}`, undefined, { "x-user-branch-id": DEST_BRANCH }), id);
    expect(res.status).toBe(200);
  });

  it("getById: 403 when caller's branch is neither origin nor destination", async () => {
    const { controller, repo } = buildController(false);
    const id = await seedWaybill(controller, repo);

    const res = await controller.getById(req("GET", `/waybills/${id}`, undefined, { "x-user-branch-id": OTHER_BRANCH }), id);
    expect(res.status).toBe(403);
  });

  it("getById: 200 when caller has branches:access_all regardless of branch", async () => {
    const { controller, repo } = buildController(true);
    const id = await seedWaybill(controller, repo);

    const res = await controller.getById(req("GET", `/waybills/${id}`, undefined, { "x-user-branch-id": OTHER_BRANCH }), id);
    expect(res.status).toBe(200);
  });

  it("cancel: 403 when caller's branch is outside scope", async () => {
    const { controller, repo } = buildController(false);
    const id = await seedWaybill(controller, repo);

    const res = await controller.cancel(
      req("POST", `/waybills/${id}/cancel`, { reason: "motivo valido" }, { "x-user-branch-id": OTHER_BRANCH }),
      id
    );
    expect(res.status).toBe(403);
  });

  it("download: 403 when caller's branch is outside scope", async () => {
    const { controller, repo } = buildController(false);
    const id = await seedWaybill(controller, repo);

    const res = await controller.download(
      req("GET", `/waybills/${id}/download?format=pdf`, undefined, { "x-user-branch-id": OTHER_BRANCH }),
      id
    );
    expect(res.status).toBe(403);
  });

  it("list: without bypass, forces implicit filter to caller's branch", async () => {
    const { controller, repo } = buildController(false);
    await seedWaybill(controller, repo);

    const res = await controller.list(req("GET", "/waybills", undefined, { "x-user-branch-id": DEST_BRANCH }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1); // DEST_BRANCH matches as destination

    const spy = await controller.list(
      req("GET", `/waybills?branchId=${OTHER_BRANCH}`, undefined, { "x-user-branch-id": DEST_BRANCH })
    );
    expect(spy.status).toBe(403);
    expect(repo).toBeDefined();
  });

  it("list: with bypass, sees waybills across branches", async () => {
    const { controller, repo } = buildController(true);
    await seedWaybill(controller, repo);

    const res = await controller.list(req("GET", "/waybills", undefined, { "x-user-branch-id": OTHER_BRANCH }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
  });
});
