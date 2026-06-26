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
import { BillingController } from "@/modules/billing/infrastructure/http/BillingController";
import { InMemoryInvoiceRepository } from "@/modules/billing/infrastructure/repositories/InMemoryInvoiceRepository";
import { FakeFacturamaGateway } from "@/modules/billing/infrastructure/services/FakeFacturamaGateway";
import { StampInvoiceUseCase } from "@/modules/billing/application/use-cases/StampInvoiceUseCase";
import { CancelInvoiceUseCase } from "@/modules/billing/application/use-cases/CancelInvoiceUseCase";
import { DownloadInvoiceFileUseCase } from "@/modules/billing/application/use-cases/DownloadInvoiceFileUseCase";
import { ListInvoicesUseCase } from "@/modules/billing/application/use-cases/ListInvoicesUseCase";
import { GetInvoiceUseCase } from "@/modules/billing/application/use-cases/GetInvoiceUseCase";
import { ListInvoicesBySaleUseCase } from "@/modules/billing/application/use-cases/ListInvoicesBySaleUseCase";
import { UploadCsdUseCase } from "@/modules/billing/application/use-cases/UploadCsdUseCase";
import { GetCsdStatusUseCase } from "@/modules/billing/application/use-cases/GetCsdStatusUseCase";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";
import type { BillingLookupService } from "@/modules/billing/application/ports/BillingLookupService";
import type { CreateInvoiceData } from "@/modules/billing/application/ports/InvoiceRepository";

const VALID_BRANCH = "11111111-1111-1111-1111-111111111111";
const OTHER_BRANCH = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_ID = "00000000-0000-0000-0000-000000000001";

function makeAuthz(opts: { grantBilling?: boolean; grantAccessAll?: boolean } = {}): AuthorizationService {
  const { grantBilling = true, grantAccessAll = false } = opts;
  return {
    userCan: jest.fn().mockImplementation((_id: string, permission: string) => {
      if (permission === "branches:access_all") return Promise.resolve(grantAccessAll);
      return Promise.resolve(grantBilling);
    }),
    listUserPermissions: jest.fn().mockResolvedValue([]),
    invalidate: jest.fn(),
    invalidateByRole: jest.fn().mockResolvedValue(undefined),
  };
}

function makeLookup(): BillingLookupService {
  return {
    findSaleWithItems: jest.fn().mockResolvedValue(null),
    findCustomer: jest.fn().mockResolvedValue(null),
    findBranch: jest.fn().mockResolvedValue(null),
  };
}

function buildController(opts: {
  authz?: AuthorizationService;
  repo?: InMemoryInvoiceRepository;
  gateway?: FakeFacturamaGateway;
} = {}) {
  const repo = opts.repo ?? new InMemoryInvoiceRepository();
  const gateway = opts.gateway ?? new FakeFacturamaGateway();
  const authz = opts.authz ?? makeAuthz();
  const lookup = makeLookup();
  const controller = new BillingController(
    new StampInvoiceUseCase(repo, gateway, lookup),
    new CancelInvoiceUseCase(repo, gateway),
    new DownloadInvoiceFileUseCase(repo, gateway),
    new ListInvoicesUseCase(repo),
    new GetInvoiceUseCase(repo),
    new ListInvoicesBySaleUseCase(repo),
    new UploadCsdUseCase(gateway),
    new GetCsdStatusUseCase(gateway),
    authz
  );
  return { controller, repo };
}

function req(
  method: string,
  url: string,
  body?: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-user-id": USER_ID,
      "x-user-branch-id": VALID_BRANCH,
      ...headers,
    },
  });
}

const INVOICE_ID_VALID_BRANCH = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const INVOICE_ID_OTHER_BRANCH = "cccccccc-cccc-cccc-cccc-cccccccccccc";

function makeInvoiceData(branchId: string, overrides: Partial<CreateInvoiceData> = {}): CreateInvoiceData {
  const defaultId = branchId === OTHER_BRANCH ? INVOICE_ID_OTHER_BRANCH : INVOICE_ID_VALID_BRANCH;
  return {
    id: defaultId,
    uuid: "A1B2C3D4-0000-0000-0000-000000000001",
    facturamaCfdiId: "cfdi-fake-001",
    status: "stamped",
    cfdiType: "I",
    cfdiUse: "G03",
    paymentForm: "01",
    paymentMethod: "PUE",
    receiverRfc: "CAN850101AAA",
    receiverName: "Cliente SA de CV",
    receiverCfdiUse: "G03",
    receiverFiscalRegime: "601",
    receiverTaxZipCode: "45010",
    currency: "MXN",
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    xmlUrl: null,
    pdfUrl: null,
    saleId: null,
    branchId,
    customerId: null,
    creatorId: USER_ID,
    items: [],
    ...overrides,
  };
}

describe("BillingController — branch scoping: list", () => {
  it("operator scoped to VALID_BRANCH only sees VALID_BRANCH invoices", async () => {
    const repo = new InMemoryInvoiceRepository();
    await repo.createStamped(makeInvoiceData(VALID_BRANCH));
    await repo.createStamped(makeInvoiceData(OTHER_BRANCH, { id: INVOICE_ID_OTHER_BRANCH }));

    const { controller } = buildController({ repo, authz: makeAuthz({ grantBilling: true, grantAccessAll: false }) });
    const res = await controller.list(req("GET", "/admin/invoices"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].branchId).toBe(VALID_BRANCH);
  });

  it("operator requesting other branch explicitly → 403", async () => {
    const { controller } = buildController({ authz: makeAuthz({ grantBilling: true, grantAccessAll: false }) });
    const res = await controller.list(req("GET", `/admin/invoices?branchId=${OTHER_BRANCH}`));
    expect(res.status).toBe(403);
  });

  it("operator without assigned branch and no bypass → 403", async () => {
    const { controller } = buildController({ authz: makeAuthz({ grantBilling: true, grantAccessAll: false }) });
    const res = await controller.list(
      req("GET", "/admin/invoices", undefined, { "x-user-branch-id": "" })
    );
    expect(res.status).toBe(403);
  });

  it("admin with branches:access_all sees all branches", async () => {
    const repo = new InMemoryInvoiceRepository();
    await repo.createStamped(makeInvoiceData(VALID_BRANCH));
    await repo.createStamped(makeInvoiceData(OTHER_BRANCH, { id: INVOICE_ID_OTHER_BRANCH }));

    const { controller } = buildController({ repo, authz: makeAuthz({ grantBilling: true, grantAccessAll: true }) });
    const res = await controller.list(
      req("GET", "/admin/invoices", undefined, { "x-user-branch-id": "" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(2);
  });
});

describe("BillingController — branch scoping: getById", () => {
  it("403 when invoice belongs to OTHER_BRANCH and caller is scoped to VALID_BRANCH", async () => {
    const repo = new InMemoryInvoiceRepository();
    const inv = await repo.createStamped(makeInvoiceData(OTHER_BRANCH));

    const { controller } = buildController({ repo, authz: makeAuthz({ grantBilling: true, grantAccessAll: false }) });
    const res = await controller.getById(req("GET", `/admin/invoices/${inv.id}`), inv.id);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.required).toBe("branches:access_all");
  });

  it("200 when invoice belongs to caller's branch", async () => {
    const repo = new InMemoryInvoiceRepository();
    const inv = await repo.createStamped(makeInvoiceData(VALID_BRANCH));

    const { controller } = buildController({ repo, authz: makeAuthz({ grantBilling: true, grantAccessAll: false }) });
    const res = await controller.getById(req("GET", `/admin/invoices/${inv.id}`), inv.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(inv.id);
  });

  it("admin with bypass can read any branch invoice", async () => {
    const repo = new InMemoryInvoiceRepository();
    const inv = await repo.createStamped(makeInvoiceData(OTHER_BRANCH));

    const { controller } = buildController({ repo, authz: makeAuthz({ grantBilling: true, grantAccessAll: true }) });
    const res = await controller.getById(
      req("GET", `/admin/invoices/${inv.id}`, undefined, { "x-user-branch-id": "" }),
      inv.id
    );
    expect(res.status).toBe(200);
  });
});

describe("BillingController — branch scoping: cancel", () => {
  it("403 when invoice belongs to OTHER_BRANCH and caller is scoped to VALID_BRANCH", async () => {
    const repo = new InMemoryInvoiceRepository();
    const inv = await repo.createStamped(makeInvoiceData(OTHER_BRANCH));

    const { controller } = buildController({ repo, authz: makeAuthz({ grantBilling: true, grantAccessAll: false }) });
    const res = await controller.cancel(
      req("POST", `/admin/invoices/${inv.id}/cancel`, { motive: "02" }),
      inv.id
    );
    expect(res.status).toBe(403);
  });

  it("200 when invoice belongs to caller's branch", async () => {
    const repo = new InMemoryInvoiceRepository();
    const inv = await repo.createStamped(makeInvoiceData(VALID_BRANCH));

    const { controller } = buildController({ repo, authz: makeAuthz({ grantBilling: true, grantAccessAll: false }) });
    const res = await controller.cancel(
      req("POST", `/admin/invoices/${inv.id}/cancel`, { motive: "02" }),
      inv.id
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("cancelled");
  });
});

describe("BillingController — branch scoping: download", () => {
  it("403 when invoice belongs to OTHER_BRANCH and caller is scoped to VALID_BRANCH", async () => {
    const repo = new InMemoryInvoiceRepository();
    const inv = await repo.createStamped(makeInvoiceData(OTHER_BRANCH));

    const { controller } = buildController({ repo, authz: makeAuthz({ grantBilling: true, grantAccessAll: false }) });
    const res = await controller.download(
      req("GET", `/admin/invoices/${inv.id}/download?format=pdf`),
      inv.id
    );
    expect(res.status).toBe(403);
  });

  it("200 when invoice belongs to caller's branch", async () => {
    const repo = new InMemoryInvoiceRepository();
    const inv = await repo.createStamped(makeInvoiceData(VALID_BRANCH));

    const { controller } = buildController({ repo, authz: makeAuthz({ grantBilling: true, grantAccessAll: false }) });
    const res = await controller.download(
      req("GET", `/admin/invoices/${inv.id}/download?format=pdf`),
      inv.id
    );
    expect(res.status).toBe(200);
  });
});
