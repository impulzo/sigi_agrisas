// @react-pdf/renderer is a server-only ESM lib; mock it for the node test env
import { renderToBuffer } from "@react-pdf/renderer";
jest.mock("@react-pdf/renderer", () => ({
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.from("%PDF-1.4 mock")),
  Document: "Document",
  Page: "Page",
  Text: "Text",
  View: "View",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("@/modules/billing/infrastructure/pdf/InvoiceDocumentPdf", () => ({
  InvoiceDocumentPdf: () => null,
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

jest.mock("@/shared/infrastructure/emitter/emitterFiscalSettingsStore", () => ({
  upsertEmitterFiscalSettings: jest.fn(),
  getEmitterFiscalSettings: jest.fn().mockResolvedValue(null),
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
import { upsertEmitterFiscalSettings } from "@/shared/infrastructure/emitter/emitterFiscalSettingsStore";
import type { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";
import type { BillingLookupService } from "@/modules/billing/application/ports/BillingLookupService";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const mockedUpsert = upsertEmitterFiscalSettings as jest.Mock;
const mockRenderToBuffer = renderToBuffer as jest.MockedFunction<typeof renderToBuffer>;

function makeAuthz(overrides: Partial<AuthorizationService> = {}): AuthorizationService {
  return {
    userCan: jest.fn().mockResolvedValue(true),
    listUserPermissions: jest.fn().mockResolvedValue([]),
    invalidate: jest.fn(),
    invalidateByRole: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeLookup(): BillingLookupService {
  return {
    findSaleWithItems: jest.fn().mockResolvedValue(null),
    findCustomer: jest.fn().mockResolvedValue(null),
    findBranch: jest.fn().mockResolvedValue(null),
    findHeadquarters: jest.fn().mockResolvedValue(null),
  };
}

function buildController(authzOverride?: AuthorizationService) {
  const repo = new InMemoryInvoiceRepository();
  const gateway = new FakeFacturamaGateway();
  const authz = authzOverride ?? makeAuthz();
  const lookup = makeLookup();
  const downloadUseCase = new DownloadInvoiceFileUseCase(repo, gateway);
  const mailer = { send: jest.fn().mockResolvedValue(undefined) };
  return new BillingController(
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
}

function req(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/admin/billing/csd", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-user-id": USER_ID },
  });
}

const VALID_BODY = {
  rfc: "XAXX010101000",
  certificateBase64: "cert",
  privateKeyBase64: "key",
  privateKeyPassword: "pass",
};

describe("BillingController — uploadCsd schema", () => {
  beforeEach(() => {
    mockedUpsert.mockReset();
  });

  it("accepts a valid body with fiscal fields and returns 200", async () => {
    const controller = buildController();
    const res = await controller.uploadCsd(req({ ...VALID_BODY, legalName: "Agrisas", fiscalRegime: "601", zipCode: "83000" }));
    expect(res.status).toBe(200);
    expect(mockedUpsert).toHaveBeenCalledWith({
      rfc: VALID_BODY.rfc,
      legalName: "Agrisas",
      fiscalRegime: "601",
      zipCode: "83000",
    });
  });

  it("accepts a valid body without the optional fiscal fields", async () => {
    const controller = buildController();
    const res = await controller.uploadCsd(req(VALID_BODY));
    expect(res.status).toBe(200);
  });

  it("rejects invalid fiscalRegime format with 400", async () => {
    const controller = buildController();
    const res = await controller.uploadCsd(req({ ...VALID_BODY, fiscalRegime: "ABC" }));
    expect(res.status).toBe(400);
    expect(mockedUpsert).not.toHaveBeenCalled();
  });

  it("rejects invalid zipCode format with 400", async () => {
    const controller = buildController();
    const res = await controller.uploadCsd(req({ ...VALID_BODY, zipCode: "1234" }));
    expect(res.status).toBe(400);
    expect(mockedUpsert).not.toHaveBeenCalled();
  });
});

function previewReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/admin/invoices/preview/pdf", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-user-id": USER_ID },
  });
}

const VALID_PREVIEW_BODY = {
  issuer: { name: "Agrisas" },
  receiver: {
    rfc: "XAXX010101000",
    name: "Cliente de prueba",
    cfdiUse: "G03",
    fiscalRegime: "601",
    taxZipCode: "83000",
  },
  lines: [
    {
      description: "Producto de prueba",
      productCode: "P001",
      quantity: 1,
      unitPrice: 100,
      discountPct: 0,
      ivaRate: 0.16,
      iepsRate: 0,
      lineSubtotal: 100,
      lineTotal: 116,
    },
  ],
  paymentForm: "03",
  paymentMethod: "PUE",
  subtotal: 100,
  taxTotal: 16,
  total: 116,
  currency: "MXN",
};

describe("BillingController — previewPdf", () => {
  beforeEach(() => {
    mockRenderToBuffer.mockClear();
    mockRenderToBuffer.mockResolvedValue(Buffer.from("%PDF-1.4 mock"));
  });

  it("valid body → 200 application/pdf, does not call FacturamaGateway.stamp nor persist", async () => {
    const controller = buildController();
    const stampSpy = jest.spyOn(FakeFacturamaGateway.prototype, "stamp");
    const persistSpy = jest.spyOn(InMemoryInvoiceRepository.prototype, "createStamped");

    const res = await controller.previewPdf(previewReq(VALID_PREVIEW_BODY));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(stampSpy).not.toHaveBeenCalled();
    expect(persistSpy).not.toHaveBeenCalled();
    stampSpy.mockRestore();
    persistSpy.mockRestore();
  });

  it("renders InvoiceDocumentPdf with the BORRADOR watermark and PENDIENTE DE TIMBRAR folio", async () => {
    const controller = buildController();

    await controller.previewPdf(previewReq(VALID_PREVIEW_BODY));

    expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    const element = mockRenderToBuffer.mock.calls[0][0] as unknown as {
      props: { watermark: string; folioLabel: string; data: { receiver: { rfc: string } } };
    };
    expect(element.props.watermark).toBe("BORRADOR — no válido fiscalmente");
    expect(element.props.folioLabel).toBe("PENDIENTE DE TIMBRAR");
    expect(element.props.data.receiver.rfc).toBe(VALID_PREVIEW_BODY.receiver.rfc);
  });

  it("body missing receiver → 400", async () => {
    const controller = buildController();
    const { receiver, ...withoutReceiver } = VALID_PREVIEW_BODY;

    const res = await controller.previewPdf(previewReq(withoutReceiver));

    expect(res.status).toBe(400);
    expect(mockRenderToBuffer).not.toHaveBeenCalled();
  });

  it("body with empty lines → 400", async () => {
    const controller = buildController();

    const res = await controller.previewPdf(previewReq({ ...VALID_PREVIEW_BODY, lines: [] }));

    expect(res.status).toBe(400);
    expect(mockRenderToBuffer).not.toHaveBeenCalled();
  });

  it("without billing:write → 403", async () => {
    const controller = buildController(makeAuthz({ userCan: jest.fn().mockResolvedValue(false) }));

    const res = await controller.previewPdf(previewReq(VALID_PREVIEW_BODY));

    expect(res.status).toBe(403);
    expect(mockRenderToBuffer).not.toHaveBeenCalled();
  });
});
