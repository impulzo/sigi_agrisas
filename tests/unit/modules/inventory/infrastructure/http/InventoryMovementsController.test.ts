// @react-pdf/renderer is a server-only ESM lib; mock it for the node test env
jest.mock("@react-pdf/renderer", () => ({
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.from("%PDF-1.4 mock")),
  Document: ({ children }: { children: unknown }) => children,
  Page: ({ children }: { children: unknown }) => children,
  Text: ({ children }: { children: unknown }) => children,
  View: ({ children }: { children: unknown }) => children,
  StyleSheet: { create: (s: unknown) => s },
}));

// KardexReportPdf uses JSX which the node test env can't parse; mock the whole module
jest.mock("@/modules/inventory/infrastructure/pdf/KardexReportPdf", () => ({
  KardexReportPdf: () => null,
}));

import { NextRequest } from "next/server";
import { InventoryMovementsController } from "@/modules/inventory/infrastructure/http/InventoryMovementsController";
import { GetKardexReportUseCase } from "@/modules/inventory/application/use-cases/GetKardexReportUseCase";
import { RebuildInventoryArticleUseCase } from "@/modules/inventory/application/use-cases/RebuildInventoryArticleUseCase";
import { InMemoryInventoryMovementRepository } from "@/modules/inventory/infrastructure/repositories/InMemoryInventoryMovementRepository";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";
import { InventoryMovement } from "@/modules/inventory/domain/entities/InventoryMovement";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const BRANCH_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_BRANCH = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function makeAuthz(grants: Record<string, boolean>): AuthorizationService {
  return {
    userCan: jest.fn().mockImplementation((_userId: string, key: string) => Promise.resolve(grants[key] ?? false)),
    listUserPermissions: jest.fn().mockResolvedValue([]),
    invalidate: jest.fn(),
    invalidateByRole: jest.fn().mockResolvedValue(undefined),
  };
}

async function setup() {
  const movementRepo = new InMemoryInventoryMovementRepository();
  const productRepo = new InMemoryProductRepository();
  productRepo.reset();
  const { product } = await productRepo.create({
    code: "KDX1",
    name: "Producto Kardex",
    unit: "PZA",
    departmentId: "dept-1",
  });
  return { movementRepo, productRepo, productId: product.id };
}

function buildController(
  movementRepo: InMemoryInventoryMovementRepository,
  productRepo: InMemoryProductRepository,
  authz: AuthorizationService
) {
  return new InventoryMovementsController(
    new GetKardexReportUseCase(movementRepo, productRepo),
    new RebuildInventoryArticleUseCase(movementRepo),
    authz
  );
}

function req(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    headers: { "x-user-id": USER_ID, "x-user-branch-id": BRANCH_ID, ...headers },
  });
}

function postReq(url: string, body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-user-id": USER_ID, "x-user-branch-id": BRANCH_ID, ...headers },
  });
}

describe("InventoryMovementsController — getKardex", () => {
  it("401 when x-user-id is missing", async () => {
    const { movementRepo, productRepo, productId } = await setup();
    const controller = buildController(movementRepo, productRepo, makeAuthz({ "inventory:kardex_read": true }));
    const res = await controller.getKardex(
      new NextRequest(`http://localhost/api/v1/admin/inventory/kardex?productId=${productId}&from=2026-01-01&to=2026-01-31`)
    );
    expect(res.status).toBe(401);
  });

  it("403 when the caller lacks inventory:kardex_read", async () => {
    const { movementRepo, productRepo, productId } = await setup();
    const controller = buildController(movementRepo, productRepo, makeAuthz({}));
    const res = await controller.getKardex(
      req(`/api/v1/admin/inventory/kardex?productId=${productId}&from=2026-01-01&to=2026-01-31`)
    );
    expect(res.status).toBe(403);
  });

  it("400 on an invalid format", async () => {
    const { movementRepo, productRepo, productId } = await setup();
    const controller = buildController(movementRepo, productRepo, makeAuthz({ "inventory:kardex_read": true }));
    const res = await controller.getKardex(
      req(`/api/v1/admin/inventory/kardex?productId=${productId}&from=2026-01-01&to=2026-01-31&format=csv`)
    );
    expect(res.status).toBe(400);
  });

  it("400 when from > to", async () => {
    const { movementRepo, productRepo, productId } = await setup();
    const controller = buildController(movementRepo, productRepo, makeAuthz({ "inventory:kardex_read": true }));
    const res = await controller.getKardex(
      req(`/api/v1/admin/inventory/kardex?productId=${productId}&from=2026-02-01&to=2026-01-01`)
    );
    expect(res.status).toBe(400);
  });

  it("404 when productId does not exist", async () => {
    const { movementRepo, productRepo } = await setup();
    const controller = buildController(movementRepo, productRepo, makeAuthz({ "inventory:kardex_read": true }));
    const res = await controller.getKardex(
      req(
        `/api/v1/admin/inventory/kardex?productId=99999999-9999-9999-9999-999999999999&from=2026-01-01&to=2026-01-31`
      )
    );
    expect(res.status).toBe(404);
  });

  it("403 when a non-bypass caller requests another branch", async () => {
    const { movementRepo, productRepo, productId } = await setup();
    const controller = buildController(movementRepo, productRepo, makeAuthz({ "inventory:kardex_read": true }));
    const res = await controller.getKardex(
      req(
        `/api/v1/admin/inventory/kardex?productId=${productId}&branchId=${OTHER_BRANCH}&from=2026-01-01&to=2026-01-31`
      )
    );
    expect(res.status).toBe(403);
  });

  it("200 with header + movements for a valid request", async () => {
    const { movementRepo, productRepo, productId } = await setup();
    movementRepo.setCurrentQuantity(BRANCH_ID, productId, 10);
    movementRepo.seed(
      InventoryMovement.create({
        id: "m1",
        branchId: BRANCH_ID,
        productId,
        movementAt: new Date("2026-01-10"),
        sequence: 1,
        movementType: "sale",
        direction: "OUT",
        quantity: 5,
        unit: "PZA",
        balanceAfter: 10,
        unitCost: null,
        unitPrice: 100,
        customerId: null,
        providerId: null,
        folioId: null,
        folioCode: "TK-000001",
        folioNumber: 1,
        originFolioCode: null,
        originFolioNumber: null,
        sourceType: "sale",
        sourceId: "sale-1",
        status: "Aplicada",
        notes: null,
        createdBy: null,
        createdAt: new Date("2026-01-10"),
      })
    );

    const controller = buildController(movementRepo, productRepo, makeAuthz({ "inventory:kardex_read": true }));
    const res = await controller.getKardex(
      req(`/api/v1/admin/inventory/kardex?productId=${productId}&branchId=${BRANCH_ID}&from=2026-01-01&to=2026-01-31`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.header.saldoFinal).toBe(10);
    expect(body.movements).toHaveLength(1);
  });
});

describe("InventoryMovementsController — rebuild", () => {
  it("403 when the caller lacks inventory:write", async () => {
    const { movementRepo, productRepo, productId } = await setup();
    const controller = buildController(movementRepo, productRepo, makeAuthz({}));
    const res = await controller.rebuild(postReq("/api/v1/admin/inventory/kardex/rebuild", { productId, branchId: BRANCH_ID }));
    expect(res.status).toBe(403);
  });

  it("rebuilds successfully and returns previous/new quantities", async () => {
    const { movementRepo, productRepo, productId } = await setup();
    movementRepo.setCurrentQuantity(BRANCH_ID, productId, 999);
    movementRepo.seed(
      InventoryMovement.create({
        id: "m1",
        branchId: BRANCH_ID,
        productId,
        movementAt: new Date("2026-01-10"),
        sequence: 1,
        movementType: "adjustment_in",
        direction: "IN",
        quantity: 30,
        unit: "PZA",
        balanceAfter: 999,
        unitCost: null,
        unitPrice: null,
        customerId: null,
        providerId: null,
        folioId: null,
        folioCode: null,
        folioNumber: null,
        originFolioCode: null,
        originFolioNumber: null,
        sourceType: "adjustment",
        sourceId: "adj-1",
        status: "Aplicada",
        notes: null,
        createdBy: null,
        createdAt: new Date("2026-01-10"),
      })
    );

    const controller = buildController(movementRepo, productRepo, makeAuthz({ "inventory:write": true }));
    const res = await controller.rebuild(postReq("/api/v1/admin/inventory/kardex/rebuild", { productId, branchId: BRANCH_ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.previousQuantity).toBe(999);
    expect(body.newQuantity).toBe(30);
    expect(body.movementsRebuilt).toBe(1);
  });

  it("returns movementsRebuilt=0 when there are no movements", async () => {
    const { movementRepo, productRepo, productId } = await setup();
    const controller = buildController(movementRepo, productRepo, makeAuthz({ "inventory:write": true }));
    const res = await controller.rebuild(postReq("/api/v1/admin/inventory/kardex/rebuild", { productId, branchId: BRANCH_ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.movementsRebuilt).toBe(0);
  });
});
