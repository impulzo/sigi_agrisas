// @react-pdf/renderer is a server-only ESM lib; mock it for the node test env
jest.mock("@react-pdf/renderer", () => ({
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.from("%PDF-1.4 mock")),
  Document: "Document",
  Page: "Page",
  Text: "Text",
  View: "View",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("@/modules/reports/infrastructure/pdf/InventoryStockReportPdf", () => ({
  InventoryStockReportPdf: () => null,
}));

jest.mock("@/modules/reports/infrastructure/pdf/PaymentHistoryReportPdf", () => ({
  PaymentHistoryReportPdf: () => null,
}));

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
import { Decimal } from "decimal.js";
import { ReportsController } from "@/modules/reports/infrastructure/http/ReportsController";
import { GetInventoryStockReportUseCase } from "@/modules/reports/application/use-cases/GetInventoryStockReportUseCase";
import { GetPaymentHistoryReportUseCase } from "@/modules/reports/application/use-cases/GetPaymentHistoryReportUseCase";
import { InMemoryInventoryReportRepository } from "@/modules/reports/infrastructure/repositories/InMemoryInventoryReportRepository";
import { InMemoryPaymentReportRepository } from "@/modules/reports/infrastructure/repositories/InMemoryPaymentReportRepository";
import { RawStockRow } from "@/modules/reports/application/ports/InventoryReportRepository";
import { RawPaymentRow } from "@/modules/reports/application/ports/PaymentReportRepository";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";

const BASE_URL = "http://localhost:3000/api/v1/admin/reports";
const BRANCH_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_BRANCH = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const DEPT_ID = "22222222-2222-2222-2222-222222222222";
const USER_ID = "00000000-0000-0000-0000-000000000001";

function makeAuthz(overrides: { userCan?: (id: string, key: string) => Promise<boolean> } = {}): AuthorizationService {
  return {
    userCan: overrides.userCan ?? jest.fn().mockResolvedValue(true),
    listUserPermissions: jest.fn().mockResolvedValue([]),
    invalidate: jest.fn(),
    invalidateByRole: jest.fn().mockResolvedValue(undefined),
  };
}

function makeStockRow(): RawStockRow {
  return {
    branchId: BRANCH_ID, branchCode: "MAT", branchName: "Matriz", isHeadquarters: true,
    departmentId: DEPT_ID, departmentCode: "D1", departmentName: "Dept 1",
    productId: "prod-1", code: "P001", name: "Prod 1", unit: "PZA",
    quantity: new Decimal("10"), reservedQuantity: new Decimal("0"), reorderPoint: new Decimal("5"),
  };
}

function makePaymentRow(): RawPaymentRow {
  return {
    paymentId: "pay-1", folioNumber: "RECIBO-001", saleId: "sale-1", saleFolioNumber: "VNT-001",
    customerId: "cust-1", customerCode: "C001", customerName: "Cliente", branchId: BRANCH_ID, branchCode: "MAT",
    amount: new Decimal("500"), paymentDate: new Date("2026-06-01T10:00:00Z"), status: "completed",
    registeredBy: USER_ID, registeredByEmail: "op@test.com",
  };
}

function makeStockController(rows: RawStockRow[] = [], authz?: AuthorizationService) {
  const repo = new InMemoryInventoryReportRepository(rows);
  const stockUC = new GetInventoryStockReportUseCase(repo);
  const payRepo = new InMemoryPaymentReportRepository([]);
  const payUC = new GetPaymentHistoryReportUseCase(payRepo);
  return new ReportsController(stockUC, payUC, authz ?? makeAuthz());
}

function makePaymentController(rows: RawPaymentRow[] = [], authz?: AuthorizationService) {
  const stockRepo = new InMemoryInventoryReportRepository([]);
  const stockUC = new GetInventoryStockReportUseCase(stockRepo);
  const payRepo = new InMemoryPaymentReportRepository(rows);
  const payUC = new GetPaymentHistoryReportUseCase(payRepo);
  return new ReportsController(stockUC, payUC, authz ?? makeAuthz());
}

function req(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(url, { headers });
}

function authHeaders(branchId = BRANCH_ID) {
  return { "x-user-id": USER_ID, "x-user-email": "op@test.com", "x-user-branch-id": branchId };
}

// ─── Inventory Stock Report ────────────────────────────────────────────────

describe("ReportsController - getInventoryStockReport", () => {
  it("401 sin x-user-id", async () => {
    const ctrl = makeStockController([], makeAuthz({ userCan: async () => false }));
    const res = await ctrl.getInventoryStockReport(req(`${BASE_URL}/inventory/stock`));
    expect(res.status).toBe(401);
  });

  it("403 sin reports:inventory_read", async () => {
    const authz = makeAuthz({ userCan: jest.fn().mockResolvedValue(false) });
    const ctrl = makeStockController([], authz);
    const res = await ctrl.getInventoryStockReport(
      req(`${BASE_URL}/inventory/stock`, authHeaders())
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.required).toBe("reports:inventory_read");
  });

  it("400 con branchId UUID inválido", async () => {
    const ctrl = makeStockController();
    const res = await ctrl.getInventoryStockReport(
      req(`${BASE_URL}/inventory/stock?branchId=not-a-uuid`, authHeaders())
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid branchId" });
  });

  it("400 con departmentId UUID inválido", async () => {
    const ctrl = makeStockController();
    const res = await ctrl.getInventoryStockReport(
      req(`${BASE_URL}/inventory/stock?departmentId=bad`, authHeaders())
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid departmentId" });
  });

  it("400 con ?format=csv", async () => {
    const ctrl = makeStockController();
    const res = await ctrl.getInventoryStockReport(
      req(`${BASE_URL}/inventory/stock?format=csv`, authHeaders())
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid format. Allowed: json, pdf" });
  });

  it("400 con ?includeZeroStock=maybe", async () => {
    const ctrl = makeStockController();
    const res = await ctrl.getInventoryStockReport(
      req(`${BASE_URL}/inventory/stock?includeZeroStock=maybe`, authHeaders())
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid includeZeroStock" });
  });

  it("200 JSON con forma del DTO", async () => {
    const ctrl = makeStockController([makeStockRow()]);
    const res = await ctrl.getInventoryStockReport(
      req(`${BASE_URL}/inventory/stock`, authHeaders())
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("branches");
    expect(body).toHaveProperty("totals");
    expect(body).toHaveProperty("generatedAt");
    expect(body).toHaveProperty("generatedBy");
    expect(body).toHaveProperty("filters");
  });

  it("200 PDF con Content-Type y Content-Disposition correctos", async () => {
    const ctrl = makeStockController([makeStockRow()]);
    const res = await ctrl.getInventoryStockReport(
      req(`${BASE_URL}/inventory/stock?format=pdf`, authHeaders())
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    const disposition = res.headers.get("Content-Disposition") ?? "";
    expect(disposition).toMatch(/^attachment; filename="stock-\d{4}-\d{2}-\d{2}\.pdf"$/);
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("403 branch scope cross-branch sin bypass", async () => {
    const authz = makeAuthz({
      userCan: jest.fn().mockImplementation(async (_id, key) => {
        if (key === "reports:inventory_read") return true;
        return false;
      }),
    });
    const ctrl = makeStockController([], authz);
    const res = await ctrl.getInventoryStockReport(
      req(`${BASE_URL}/inventory/stock?branchId=${OTHER_BRANCH}`, authHeaders(BRANCH_ID))
    );
    expect(res.status).toBe(403);
  });
});

// ─── Payment History Report ────────────────────────────────────────────────

describe("ReportsController - getPaymentHistoryReport", () => {
  it("401 sin x-user-id", async () => {
    const ctrl = makePaymentController([], makeAuthz({ userCan: async () => false }));
    const res = await ctrl.getPaymentHistoryReport(req(`${BASE_URL}/payments/history`));
    expect(res.status).toBe(401);
  });

  it("403 sin payments:report_read", async () => {
    const authz = makeAuthz({ userCan: jest.fn().mockResolvedValue(false) });
    const ctrl = makePaymentController([], authz);
    const res = await ctrl.getPaymentHistoryReport(
      req(`${BASE_URL}/payments/history`, authHeaders())
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.required).toBe("payments:report_read");
  });

  it("400 con customerId UUID inválido", async () => {
    const ctrl = makePaymentController();
    const res = await ctrl.getPaymentHistoryReport(
      req(`${BASE_URL}/payments/history?customerId=bad`, authHeaders())
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid customerId" });
  });

  it("400 con startDate formato inválido", async () => {
    const ctrl = makePaymentController();
    const res = await ctrl.getPaymentHistoryReport(
      req(`${BASE_URL}/payments/history?startDate=01-06-2026`, authHeaders())
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid startDate" });
  });

  it("200 JSON con forma del DTO", async () => {
    const ctrl = makePaymentController([makePaymentRow()]);
    const res = await ctrl.getPaymentHistoryReport(
      req(`${BASE_URL}/payments/history`, authHeaders())
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("payments");
    expect(body).toHaveProperty("summary");
    expect(body).toHaveProperty("generatedAt");
    expect(body).toHaveProperty("filters");
  });

  it("200 PDF con Content-Type y Content-Disposition correctos", async () => {
    const ctrl = makePaymentController([makePaymentRow()]);
    const res = await ctrl.getPaymentHistoryReport(
      req(`${BASE_URL}/payments/history?format=pdf`, authHeaders())
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    const disposition = res.headers.get("Content-Disposition") ?? "";
    expect(disposition).toMatch(/^attachment; filename="payments-\d{4}-\d{2}-\d{2}\.pdf"$/);
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("403 branch scope cross-branch sin bypass", async () => {
    const authz = makeAuthz({
      userCan: jest.fn().mockImplementation(async (_id, key) => {
        if (key === "payments:report_read") return true;
        return false;
      }),
    });
    const ctrl = makePaymentController([], authz);
    const res = await ctrl.getPaymentHistoryReport(
      req(`${BASE_URL}/payments/history?branchId=${OTHER_BRANCH}`, authHeaders(BRANCH_ID))
    );
    expect(res.status).toBe(403);
  });
});
