// Prevent Prisma instantiation in rbacContainer fallback
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

// @react-pdf/renderer is a server-only lib; mock it for node test env
jest.mock("@react-pdf/renderer", () => ({
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.from("%PDF-1.4 mock")),
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  View: ({ children }: { children: React.ReactNode }) => children,
  StyleSheet: { create: (s: unknown) => s },
}));

// PaymentHistoryPdf uses JSX which Jest node env can't parse; mock the whole module
jest.mock("@/modules/payments/infrastructure/pdf/PaymentHistoryPdf", () => ({
  PaymentHistoryPdf: () => null,
}));

import { NextRequest } from "next/server";
import { PaymentsController } from "@/modules/payments/infrastructure/http/PaymentsController";
import { InMemoryPaymentRepository } from "@/modules/payments/infrastructure/repositories/InMemoryPaymentRepository";
import { RegisterPaymentUseCase } from "@/modules/payments/application/use-cases/RegisterPaymentUseCase";
import { CancelPaymentUseCase } from "@/modules/payments/application/use-cases/CancelPaymentUseCase";
import { ListPaymentsUseCase } from "@/modules/payments/application/use-cases/ListPaymentsUseCase";
import { GetPaymentUseCase } from "@/modules/payments/application/use-cases/GetPaymentUseCase";
import { ListPaymentsBySaleUseCase } from "@/modules/payments/application/use-cases/ListPaymentsBySaleUseCase";
import { GetPaymentHistoryReportUseCase } from "@/modules/payments/application/use-cases/GetPaymentHistoryReportUseCase";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";

const VALID_UUID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const BRANCH_ID = "33333333-3333-3333-3333-333333333333";
const SALE_ID = "44444444-4444-4444-4444-444444444444";
const CUSTOMER_ID = "55555555-5555-5555-5555-555555555555";
const PM_ID = "66666666-6666-6666-6666-666666666666";
const FOLIO_ID = "77777777-7777-7777-7777-777777777777";

function makeAuthz(bypass: boolean): AuthorizationService {
  return {
    userCan: jest.fn().mockResolvedValue(bypass),
    listUserPermissions: jest.fn().mockResolvedValue([]),
    invalidate: jest.fn(),
    invalidateByRole: jest.fn().mockResolvedValue(undefined),
  };
}

function makeRepo() {
  const repo = new InMemoryPaymentRepository();
  repo.seedSale({
    id: SALE_ID,
    folioCode: "VNT-000001",
    folioNumber: 1,
    branchId: BRANCH_ID,
    customerId: CUSTOMER_ID,
    total: 1000,
    paidAmount: 0,
    paymentStatus: "pending",
    isCredit: true,
    status: "completed",
  });
  repo.seedCustomer({ id: CUSTOMER_ID, currentBalance: 1000, creditLimit: 5000 });
  return repo;
}

function buildController(opts: { bypass?: boolean; repo?: InMemoryPaymentRepository } = {}): PaymentsController {
  const repo = opts.repo ?? makeRepo();
  const authz = makeAuthz(opts.bypass ?? false);
  return new PaymentsController(
    new RegisterPaymentUseCase(repo),
    new CancelPaymentUseCase(repo),
    new ListPaymentsUseCase(repo),
    new GetPaymentUseCase(repo),
    new ListPaymentsBySaleUseCase(repo),
    new GetPaymentHistoryReportUseCase(repo),
    authz
  );
}

function postReq(url: string, body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-user-id": USER_ID, "x-user-branch-id": BRANCH_ID, ...headers },
  });
}

function getReq(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    headers: { "x-user-id": USER_ID, "x-user-branch-id": BRANCH_ID, ...headers },
  });
}

const validRegisterBody = {
  saleId: SALE_ID,
  paymentMethodId: PM_ID,
  folioId: FOLIO_ID,
  amount: 300,
  notes: null,
};

describe("PaymentsController — register (POST /payments)", () => {
  it("returns 201 with payment dto on success", async () => {
    const res = await buildController({ bypass: true }).register(postReq("/payments", validRegisterBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("completed");
    expect(body.amount).toBe("300.0000");
    expect(body.sale.paymentStatus).toBe("partial");
  });

  it("returns 403 when user lacks payments:create", async () => {
    const res = await buildController({ bypass: false }).register(
      postReq("/payments", validRegisterBody, { "x-user-id": USER_ID })
    );
    expect(res.status).toBe(403);
  });

  it("returns 401 when x-user-id is missing", async () => {
    const res = await buildController({ bypass: false }).register(
      postReq("/payments", validRegisterBody, { "x-user-id": "", "x-user-branch-id": "" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when amount is missing", async () => {
    const { amount: _, ...bodyWithoutAmount } = validRegisterBody;
    const res = await buildController({ bypass: true }).register(postReq("/payments", bodyWithoutAmount));
    expect(res.status).toBe(400);
  });

  it("returns 400 when amount is zero", async () => {
    const res = await buildController({ bypass: true }).register(
      postReq("/payments", { ...validRegisterBody, amount: 0 })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when saleId is not a UUID", async () => {
    const res = await buildController({ bypass: true }).register(
      postReq("/payments", { ...validRegisterBody, saleId: "not-a-uuid" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 SaleNotPayable when sale is not credit", async () => {
    const repo = new InMemoryPaymentRepository();
    repo.seedSale({
      id: SALE_ID,
      folioCode: "VNT-1",
      folioNumber: 1,
      branchId: BRANCH_ID,
      customerId: CUSTOMER_ID,
      total: 1000,
      paidAmount: 1000,
      paymentStatus: "paid",
      isCredit: false,
      status: "completed",
    });
    const res = await buildController({ bypass: true, repo }).register(postReq("/payments", validRegisterBody));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("SaleNotPayable");
    expect(body.reason).toBe("not_credit");
  });

  it("returns 409 SaleNotPayable when sale is cancelled", async () => {
    const repo = new InMemoryPaymentRepository();
    repo.seedSale({
      id: SALE_ID,
      folioCode: "VNT-1",
      folioNumber: 1,
      branchId: BRANCH_ID,
      customerId: CUSTOMER_ID,
      total: 1000,
      paidAmount: 0,
      paymentStatus: "pending",
      isCredit: true,
      status: "cancelled",
    });
    const res = await buildController({ bypass: true, repo }).register(postReq("/payments", validRegisterBody));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("SaleNotPayable");
    expect(body.status).toBe("cancelled");
  });

  it("returns 409 PaymentExceedsDueAmount when amount > remaining", async () => {
    const res = await buildController({ bypass: true }).register(
      postReq("/payments", { ...validRegisterBody, amount: 9999 })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("PaymentExceedsDueAmount");
    expect(body.due).toBe("1000.0000");
  });

  it("returns 404 when sale does not exist", async () => {
    const res = await buildController({ bypass: true }).register(
      postReq("/payments", { ...validRegisterBody, saleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when operator tries to register payment on different branch", async () => {
    const authz: AuthorizationService = {
      userCan: jest.fn().mockImplementation(async (_userId: string, permission: string) => {
        if (permission === "payments:create") return true;
        return false;
      }),
      listUserPermissions: jest.fn().mockResolvedValue([]),
      invalidate: jest.fn(),
      invalidateByRole: jest.fn().mockResolvedValue(undefined),
    };
    const repo = makeRepo();
    const controller = new PaymentsController(
      new RegisterPaymentUseCase(repo),
      new CancelPaymentUseCase(repo),
      new ListPaymentsUseCase(repo),
      new GetPaymentUseCase(repo),
      new ListPaymentsBySaleUseCase(repo),
      new GetPaymentHistoryReportUseCase(repo),
      authz
    );

    // The sale is on BRANCH_ID, but user is on "other-branch"
    const res = await controller.register(
      postReq("/payments", validRegisterBody, { "x-user-branch-id": "other-branch" })
    );
    expect(res.status).toBe(403);
  });
});

describe("PaymentsController — cancel (POST /payments/:id/cancel)", () => {
  async function seedPayment(bypass = true) {
    const repo = makeRepo();
    const controller = buildController({ bypass, repo });
    const registerRes = await controller.register(postReq("/payments", validRegisterBody));
    const { id } = await registerRes.json();
    return { repo, controller, paymentId: id };
  }

  it("returns 200 with cancelled payment on success", async () => {
    const { controller, paymentId } = await seedPayment(true);
    const res = await controller.cancel(
      postReq(`/payments/${paymentId}/cancel`, { reason: "Error del cliente" }),
      paymentId
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("cancelled");
    expect(body.cancellationReason).toBe("Error del cliente");
  });

  it("returns 400 when id is not a UUID", async () => {
    const { controller } = await seedPayment(true);
    const res = await controller.cancel(postReq("/payments/not-uuid/cancel", {}), "not-uuid");
    expect(res.status).toBe(400);
  });

  it("returns 403 when user lacks payments:cancel", async () => {
    const { paymentId } = await seedPayment(true);
    const noPermController = buildController({ bypass: false });
    const res = await noPermController.cancel(postReq(`/payments/${paymentId}/cancel`, {}), paymentId);
    expect(res.status).toBe(403);
  });

  it("returns 404 for nonexistent payment", async () => {
    const res = await buildController({ bypass: true }).cancel(
      postReq(`/payments/${VALID_UUID}/cancel`, {}),
      VALID_UUID
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 PaymentAlreadyCancelled on double cancel", async () => {
    const { controller, paymentId } = await seedPayment(true);
    await controller.cancel(postReq(`/payments/${paymentId}/cancel`, {}), paymentId);
    const res = await controller.cancel(postReq(`/payments/${paymentId}/cancel`, {}), paymentId);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("PaymentAlreadyCancelled");
  });

  it("returns 403 when operator tries to cancel payment of a different branch", async () => {
    // Register a payment (branchId = BRANCH_ID from seeded sale)
    const repo = makeRepo();
    const adminCtl = buildController({ bypass: true, repo });
    const registerRes = await adminCtl.register(postReq("/payments", validRegisterBody));
    const { id: paymentId } = await registerRes.json();

    // Build a controller where operator has payments:cancel but no branches:access_all
    const restrictedAuthz: AuthorizationService = {
      userCan: jest.fn().mockImplementation(async (_userId: string, permission: string) => {
        if (permission === "payments:cancel") return true;
        return false;
      }),
      listUserPermissions: jest.fn().mockResolvedValue([]),
      invalidate: jest.fn(),
      invalidateByRole: jest.fn().mockResolvedValue(undefined),
    };
    const restrictedCtl = new PaymentsController(
      new RegisterPaymentUseCase(repo),
      new CancelPaymentUseCase(repo),
      new ListPaymentsUseCase(repo),
      new GetPaymentUseCase(repo),
      new ListPaymentsBySaleUseCase(repo),
      new GetPaymentHistoryReportUseCase(repo),
      restrictedAuthz
    );

    const res = await restrictedCtl.cancel(
      postReq(`/payments/${paymentId}/cancel`, {}, { "x-user-branch-id": "other-branch" }),
      paymentId
    );
    expect(res.status).toBe(403);
  });
});

describe("PaymentsController — list (GET /payments)", () => {
  it("returns 200 with paginated results", async () => {
    const res = await buildController({ bypass: true }).list(getReq("/payments?pageSize=20&page=1", { "x-user-branch-id": "" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toBeDefined();
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
  });

  it("returns 403 when user lacks payments:read", async () => {
    const res = await buildController({ bypass: false }).list(getReq("/payments"));
    expect(res.status).toBe(403);
  });

  it("returns 403 when operator has no branchId and no bypass", async () => {
    const authz: AuthorizationService = {
      userCan: jest.fn().mockImplementation(async (_userId: string, permission: string) => {
        if (permission === "payments:read") return true;
        return false;
      }),
      listUserPermissions: jest.fn().mockResolvedValue([]),
      invalidate: jest.fn(),
      invalidateByRole: jest.fn().mockResolvedValue(undefined),
    };
    const repo = makeRepo();
    const controller = new PaymentsController(
      new RegisterPaymentUseCase(repo),
      new CancelPaymentUseCase(repo),
      new ListPaymentsUseCase(repo),
      new GetPaymentUseCase(repo),
      new ListPaymentsBySaleUseCase(repo),
      new GetPaymentHistoryReportUseCase(repo),
      authz
    );
    const res = await controller.list(getReq("/payments", { "x-user-branch-id": "" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid pageSize", async () => {
    const res = await buildController({ bypass: true }).list(getReq("/payments?pageSize=999"));
    expect(res.status).toBe(400);
  });
});

describe("PaymentsController — getById (GET /payments/:id)", () => {
  it("returns 200 with payment detail on success", async () => {
    const repo = makeRepo();
    const controller = buildController({ bypass: true, repo });
    const registerRes = await controller.register(postReq("/payments", validRegisterBody));
    const { id } = await registerRes.json();

    const res = await controller.getById(getReq(`/payments/${id}`), id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(id);
    expect(body.sale).toBeDefined();
  });

  it("returns 400 when id is not a UUID", async () => {
    const res = await buildController({ bypass: true }).getById(getReq("/payments/not-uuid"), "not-uuid");
    expect(res.status).toBe(400);
  });

  it("returns 403 when user lacks payments:read", async () => {
    const res = await buildController({ bypass: false }).getById(getReq(`/payments/${VALID_UUID}`), VALID_UUID);
    expect(res.status).toBe(403);
  });

  it("returns 404 for nonexistent payment", async () => {
    const res = await buildController({ bypass: true }).getById(getReq(`/payments/${VALID_UUID}`), VALID_UUID);
    expect(res.status).toBe(404);
  });
});

describe("PaymentsController — listBySale (GET /sales/:id/payments)", () => {
  it("returns 200 with sale totals and payments list", async () => {
    const repo = makeRepo();
    const controller = buildController({ bypass: true, repo });
    await controller.register(postReq("/payments", validRegisterBody));

    const res = await controller.listBySale(getReq(`/sales/${SALE_ID}/payments`), SALE_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.saleTotal).toBe("1000.0000");
    expect(body.salePaidAmount).toBe("300.0000");
    expect(body.salePaymentStatus).toBe("partial");
    expect(body.saleDueAmount).toBe("700.0000");
  });

  it("returns 400 when saleId is not a UUID", async () => {
    const res = await buildController({ bypass: true }).listBySale(
      getReq("/sales/not-uuid/payments"),
      "not-uuid"
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when user lacks payments:read", async () => {
    const res = await buildController({ bypass: false }).listBySale(
      getReq(`/sales/${SALE_ID}/payments`),
      SALE_ID
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when sale does not exist", async () => {
    const res = await buildController({ bypass: true }).listBySale(
      getReq(`/sales/${VALID_UUID}/payments`),
      VALID_UUID
    );
    expect(res.status).toBe(404);
  });
});

describe("PaymentsController — history (GET /payments/history)", () => {
  it("returns 200 JSON with totals and items", async () => {
    const repo = makeRepo();
    const controller = buildController({ bypass: true, repo });
    await controller.register(postReq("/payments", validRegisterBody));

    const res = await controller.history(getReq("/payments/history", { "x-user-branch-id": "", "x-user-email": "admin@test.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toBeDefined();
    expect(body.totals).toBeDefined();
    expect(body.totals.completedCount).toBe(1);
    expect(body.totals.totalAmountCompleted).toBe("300.0000");
  });

  it("returns 403 when user lacks payments:report_read", async () => {
    const res = await buildController({ bypass: false }).history(
      getReq("/payments/history", { "x-user-branch-id": "" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 409 ReportTooLarge when PDF mode exceeds limit", async () => {
    const repo = new InMemoryPaymentRepository();
    const mockRepo = {
      ...repo,
      findHistory: jest.fn().mockResolvedValue({
        items: [],
        total: 10001,
        totalAmountCompleted: 0,
        totalAmountCancelled: 0,
        completedCount: 10001,
        cancelledCount: 0,
      }),
    } as unknown as InMemoryPaymentRepository;

    const controller = buildController({ bypass: true, repo: mockRepo });
    const res = await controller.history(
      getReq("/payments/history?format=pdf", { "x-user-branch-id": "" })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("ReportTooLarge");
    expect(body.limit).toBe(10000);
  });

  it("returns 400 on invalid format param", async () => {
    const res = await buildController({ bypass: true }).history(
      getReq("/payments/history?format=xls", { "x-user-branch-id": "" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid pageSize param", async () => {
    const res = await buildController({ bypass: true }).history(
      getReq("/payments/history?pageSize=999", { "x-user-branch-id": "" })
    );
    expect(res.status).toBe(400);
  });
});
