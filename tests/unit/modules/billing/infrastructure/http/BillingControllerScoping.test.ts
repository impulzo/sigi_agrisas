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
import { SendInvoiceEmailUseCase } from "@/modules/billing/application/use-cases/SendInvoiceEmailUseCase";
import { ListInvoicesUseCase } from "@/modules/billing/application/use-cases/ListInvoicesUseCase";
import { GetInvoiceUseCase } from "@/modules/billing/application/use-cases/GetInvoiceUseCase";
import { ListInvoicesBySaleUseCase } from "@/modules/billing/application/use-cases/ListInvoicesBySaleUseCase";
import { UploadCsdUseCase } from "@/modules/billing/application/use-cases/UploadCsdUseCase";
import { GetCsdStatusUseCase } from "@/modules/billing/application/use-cases/GetCsdStatusUseCase";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";
import type { BillingLookupService, SaleForBilling } from "@/modules/billing/application/ports/BillingLookupService";
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

function makeLookup(overrides: Partial<BillingLookupService> = {}): BillingLookupService {
  return {
    findSaleWithItems: jest.fn().mockResolvedValue(null),
    findCustomer: jest.fn().mockResolvedValue(null),
    findBranch: jest.fn().mockResolvedValue(null),
    findHeadquarters: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function makeSale(branchId: string, overrides: Partial<SaleForBilling> = {}): SaleForBilling {
  return {
    id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    status: "completed",
    branchId,
    customerId: null,
    paymentMethodId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    items: [],
    ...overrides,
  };
}

function buildController(opts: {
  authz?: AuthorizationService;
  repo?: InMemoryInvoiceRepository;
  gateway?: FakeFacturamaGateway;
  lookup?: BillingLookupService;
} = {}) {
  const repo = opts.repo ?? new InMemoryInvoiceRepository();
  const gateway = opts.gateway ?? new FakeFacturamaGateway();
  const authz = opts.authz ?? makeAuthz();
  const lookup = opts.lookup ?? makeLookup();
  const downloadUseCase = new DownloadInvoiceFileUseCase(repo, gateway);
  const mailer = { send: jest.fn().mockResolvedValue(undefined) };
  const controller = new BillingController(
    new StampInvoiceUseCase(repo, gateway, lookup),
    new CancelInvoiceUseCase(repo, gateway),
    downloadUseCase,
    new ListInvoicesUseCase(repo),
    new GetInvoiceUseCase(repo),
    new ListInvoicesBySaleUseCase(repo),
    new UploadCsdUseCase(gateway),
    new GetCsdStatusUseCase(gateway),
    authz,
    lookup,
    new SendInvoiceEmailUseCase(repo, lookup, downloadUseCase, mailer)
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

  it("400 InvoiceNotStamped when the invoice has no facturamaCfdiId", async () => {
    const repo = new InMemoryInvoiceRepository();
    const inv = await repo.createStamped(makeInvoiceData(VALID_BRANCH, { facturamaCfdiId: null }));

    const { controller } = buildController({ repo });
    const res = await controller.download(
      req("GET", `/admin/invoices/${inv.id}/download?format=pdf`),
      inv.id
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invoice has not been stamped");
  });

  it("502 when the Facturama gateway fails to retrieve the file", async () => {
    class FailingGateway extends FakeFacturamaGateway {
      async download(): Promise<never> {
        throw new Error("Facturama timeout");
      }
    }
    const repo = new InMemoryInvoiceRepository();
    const inv = await repo.createStamped(makeInvoiceData(VALID_BRANCH));

    const { controller } = buildController({ repo, gateway: new FailingGateway() });
    const res = await controller.download(
      req("GET", `/admin/invoices/${inv.id}/download?format=pdf`),
      inv.id
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Failed to download invoice file");
  });

  it("404 when the invoice does not exist", async () => {
    const { controller } = buildController();
    const missingId = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
    const res = await controller.download(
      req("GET", `/admin/invoices/${missingId}/download?format=pdf`),
      missingId
    );
    expect(res.status).toBe(404);
  });
});

describe("BillingController — sendEmail", () => {
  it("403 when invoice belongs to OTHER_BRANCH and caller is scoped to VALID_BRANCH", async () => {
    const repo = new InMemoryInvoiceRepository();
    const inv = await repo.createStamped(makeInvoiceData(OTHER_BRANCH));

    const { controller } = buildController({ repo, authz: makeAuthz({ grantBilling: true, grantAccessAll: false }) });
    const res = await controller.sendEmail(req("POST", `/admin/invoices/${inv.id}/send-email`, {}), inv.id);
    expect(res.status).toBe(403);
  });

  it("400 when the override email is malformed", async () => {
    const repo = new InMemoryInvoiceRepository();
    const inv = await repo.createStamped(makeInvoiceData(VALID_BRANCH));

    const { controller } = buildController({ repo });
    const res = await controller.sendEmail(
      req("POST", `/admin/invoices/${inv.id}/send-email`, { email: "not-an-email" }),
      inv.id
    );
    expect(res.status).toBe(400);
  });

  it("400 when customer has no email and no override provided", async () => {
    const repo = new InMemoryInvoiceRepository();
    const inv = await repo.createStamped(makeInvoiceData(VALID_BRANCH, { customerId: "cust-1" }));
    const lookup = makeLookup({
      findCustomer: jest.fn().mockResolvedValue({
        id: "cust-1",
        name: "Cliente",
        legalName: null,
        rfc: "XAXX010101000",
        taxRegime: "601",
        cfdiUse: "G03",
        taxZipCode: "45010",
        email: null,
      }),
    });

    const { controller } = buildController({ repo, lookup });
    const res = await controller.sendEmail(req("POST", `/admin/invoices/${inv.id}/send-email`, {}), inv.id);
    expect(res.status).toBe(400);
  });

  it("200 with an override email, sends regardless of customer.email", async () => {
    const repo = new InMemoryInvoiceRepository();
    const inv = await repo.createStamped(makeInvoiceData(VALID_BRANCH));

    const { controller } = buildController({ repo });
    const res = await controller.sendEmail(
      req("POST", `/admin/invoices/${inv.id}/send-email`, { email: "otra@direccion.com" }),
      inv.id
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ sentTo: "otra@direccion.com" });
  });

  it("404 when the invoice does not exist", async () => {
    const repo = new InMemoryInvoiceRepository();
    const { controller } = buildController({ repo });
    const missingId = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
    const res = await controller.sendEmail(
      req("POST", `/admin/invoices/${missingId}/send-email`, { email: "otra@direccion.com" }),
      missingId
    );
    expect(res.status).toBe(404);
  });
});

describe("BillingController — branch scoping: listBySale", () => {
  const SALE_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";

  it("403 when sale belongs to OTHER_BRANCH and caller is scoped to VALID_BRANCH", async () => {
    const lookup = makeLookup({
      findSaleWithItems: jest.fn().mockResolvedValue(makeSale(OTHER_BRANCH, { id: SALE_ID })),
    });
    const { controller } = buildController({ lookup, authz: makeAuthz({ grantBilling: true, grantAccessAll: false }) });
    const res = await controller.listBySale(req("GET", `/admin/sales/${SALE_ID}/invoices`), SALE_ID);
    expect(res.status).toBe(403);
  });

  it("200 when sale belongs to caller's branch", async () => {
    const lookup = makeLookup({
      findSaleWithItems: jest.fn().mockResolvedValue(makeSale(VALID_BRANCH, { id: SALE_ID })),
    });
    const { controller } = buildController({ lookup, authz: makeAuthz({ grantBilling: true, grantAccessAll: false }) });
    const res = await controller.listBySale(req("GET", `/admin/sales/${SALE_ID}/invoices`), SALE_ID);
    expect(res.status).toBe(200);
  });

  it("404 when sale does not exist", async () => {
    const lookup = makeLookup({ findSaleWithItems: jest.fn().mockResolvedValue(null) });
    const { controller } = buildController({ lookup, authz: makeAuthz({ grantBilling: true, grantAccessAll: false }) });
    const res = await controller.listBySale(req("GET", `/admin/sales/${SALE_ID}/invoices`), SALE_ID);
    expect(res.status).toBe(404);
  });

  it("admin with bypass can list invoices for a sale in another branch", async () => {
    const lookup = makeLookup({
      findSaleWithItems: jest.fn().mockResolvedValue(makeSale(OTHER_BRANCH, { id: SALE_ID })),
    });
    const { controller } = buildController({ lookup, authz: makeAuthz({ grantBilling: true, grantAccessAll: true }) });
    const res = await controller.listBySale(
      req("GET", `/admin/sales/${SALE_ID}/invoices`, undefined, { "x-user-branch-id": "" }),
      SALE_ID
    );
    expect(res.status).toBe(200);
  });
});

describe("BillingController — branch scoping: stamp standalone", () => {
  const standaloneBody = {
    customer: {
      rfc: "CAN850101AAA",
      name: "Cliente SA de CV",
      cfdiUse: "G03",
      fiscalRegime: "601",
      taxZipCode: "45010",
    },
    items: [
      { productCode: "SKU1", description: "Servicio", quantity: 1, unitPrice: 100 },
    ],
  };

  it("bypass caller with no branchId falls back to headquarters", async () => {
    const lookup = makeLookup({
      findHeadquarters: jest.fn().mockResolvedValue({ id: OTHER_BRANCH, code: "MATRIZ", name: "Matriz", address: null }),
    });
    const { controller } = buildController({ lookup, authz: makeAuthz({ grantBilling: true, grantAccessAll: true }) });
    const res = await controller.stamp(
      req("POST", "/admin/invoices", standaloneBody, { "x-user-branch-id": "" })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.branchId).toBe(OTHER_BRANCH);
  });

  it("bypass caller with no branchId and no headquarters configured → 400", async () => {
    const lookup = makeLookup({ findHeadquarters: jest.fn().mockResolvedValue(null) });
    const { controller } = buildController({ lookup, authz: makeAuthz({ grantBilling: true, grantAccessAll: true }) });
    const res = await controller.stamp(
      req("POST", "/admin/invoices", standaloneBody, { "x-user-branch-id": "" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("BranchRequired");
  });

  it("non-bypass caller uses own branch, headquarters not consulted", async () => {
    const findHeadquarters = jest.fn();
    const lookup = makeLookup({ findHeadquarters });
    const { controller } = buildController({ lookup, authz: makeAuthz({ grantBilling: true, grantAccessAll: false }) });
    const res = await controller.stamp(
      req("POST", "/admin/invoices", standaloneBody, { "x-user-branch-id": VALID_BRANCH })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.branchId).toBe(VALID_BRANCH);
    expect(findHeadquarters).not.toHaveBeenCalled();
  });
});
