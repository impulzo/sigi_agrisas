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
import { GetEmitterFiscalSettingsUseCase } from "@/modules/billing/application/use-cases/GetEmitterFiscalSettingsUseCase";
import { SearchSatTaxRegimesUseCase } from "@/modules/sat-codes/application/use-cases/SearchSatTaxRegimesUseCase";
import { SearchSatCfdiUsesUseCase } from "@/modules/sat-codes/application/use-cases/SearchSatCfdiUsesUseCase";
import { SearchSatCodesUseCase } from "@/modules/sat-codes/application/use-cases/SearchSatCodesUseCase";
import { InMemorySatTaxRegimeRepository } from "@/modules/sat-codes/infrastructure/repositories/InMemorySatTaxRegimeRepository";
import { InMemorySatCfdiUseRepository } from "@/modules/sat-codes/infrastructure/repositories/InMemorySatCfdiUseRepository";
import { InMemorySatCodeRepository } from "@/modules/sat-codes/infrastructure/repositories/InMemorySatCodeRepository";
import { upsertEmitterFiscalSettings, getEmitterFiscalSettings } from "@/shared/infrastructure/emitter/emitterFiscalSettingsStore";
import type { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";
import type { BillingLookupService } from "@/modules/billing/application/ports/BillingLookupService";
import { GetTicketSettingsUseCase } from "@/modules/settings/application/use-cases/GetTicketSettingsUseCase";
import { InMemoryTicketSettingsRepository } from "@/modules/settings/infrastructure/repositories/InMemoryTicketSettingsRepository";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const mockedUpsert = upsertEmitterFiscalSettings as jest.Mock;
const mockedGetEmitter = getEmitterFiscalSettings as jest.Mock;
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

function buildController(authzOverride?: AuthorizationService, ticketSettingsRepo?: InMemoryTicketSettingsRepository) {
  const repo = new InMemoryInvoiceRepository();
  const gateway = new FakeFacturamaGateway();
  const authz = authzOverride ?? makeAuthz();
  const lookup = makeLookup();
  const downloadUseCase = new DownloadInvoiceFileUseCase(repo, gateway);
  const mailer = { send: jest.fn().mockResolvedValue(undefined) };
  const getTicketSettingsUseCase = new GetTicketSettingsUseCase(ticketSettingsRepo ?? new InMemoryTicketSettingsRepository());
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
    new SendInvoiceEmailUseCase(repo, lookup, downloadUseCase, mailer),
    getTicketSettingsUseCase,
    new GetEmitterFiscalSettingsUseCase(gateway, getTicketSettingsUseCase),
    new SearchSatTaxRegimesUseCase(new InMemorySatTaxRegimeRepository()),
    new SearchSatCfdiUsesUseCase(new InMemorySatCfdiUseRepository()),
    new SearchSatCodesUseCase(new InMemorySatCodeRepository()),
    gateway,
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
    mockedGetEmitter.mockReset();
    mockedGetEmitter.mockResolvedValue(null);
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
      props: { watermark: string; folioLabel: string; isDraft: boolean; data: { receiver: { rfc: string } } };
    };
    expect(element.props.watermark).toBe("BORRADOR — no válido fiscalmente");
    expect(element.props.folioLabel).toBe("PENDIENTE DE TIMBRAR");
    expect(element.props.isDraft).toBe(true);
    expect(element.props.data.receiver.rfc).toBe(VALID_PREVIEW_BODY.receiver.rfc);
  });

  it("includes SAT catalog description labels for issuer/receiver fiscal regime and receiver CFDI use, falling back to raw code when the catalog has no match", async () => {
    const controller = buildController();

    await controller.previewPdf(previewReq(VALID_PREVIEW_BODY));

    const element = mockRenderToBuffer.mock.calls[0][0] as unknown as {
      props: {
        data: {
          issuer: { fiscalRegimeLabel: string | null };
          receiver: { fiscalRegimeLabel: string | null; cfdiUseLabel: string | null };
        };
      };
    };
    // buildController() has no EmitterFiscalSettings/TicketSettings/CSD captured — issuer fiscalRegime is null, nothing to resolve.
    expect(element.props.data.issuer.fiscalRegimeLabel).toBeNull();
    expect(element.props.data.receiver.fiscalRegimeLabel).toBe(VALID_PREVIEW_BODY.receiver.fiscalRegime);
    expect(element.props.data.receiver.cfdiUseLabel).toBe(VALID_PREVIEW_BODY.receiver.cfdiUse);
  });

  it("resolves logoUrl server-side via GetTicketSettingsUseCase and injects it into issuer data, ignoring any client-supplied logo field", async () => {
    const settingsRepo = new InMemoryTicketSettingsRepository();
    await settingsRepo.updateLogoUrl("https://storage.example.com/tenant-logo.png");
    const controller = buildController(undefined, settingsRepo);

    const bodyWithClientLogo = {
      ...VALID_PREVIEW_BODY,
      issuer: { ...VALID_PREVIEW_BODY.issuer, logoUrl: "https://attacker.example.com/fake-logo.png" },
    };

    await controller.previewPdf(previewReq(bodyWithClientLogo));

    expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    const element = mockRenderToBuffer.mock.calls[0][0] as unknown as {
      props: { data: { issuer: { logoUrl: string | null } } };
    };
    expect(element.props.data.issuer.logoUrl).toBe("https://storage.example.com/tenant-logo.png");
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

  it("line with null discountPct/ivaRate/iepsRate → 400 (client must normalize to 0)", async () => {
    const controller = buildController();
    const bodyWithNulls = {
      ...VALID_PREVIEW_BODY,
      lines: [{ ...VALID_PREVIEW_BODY.lines[0], discountPct: null, ivaRate: null, iepsRate: null }],
    };

    const res = await controller.previewPdf(previewReq(bodyWithNulls));

    expect(res.status).toBe(400);
    expect(mockRenderToBuffer).not.toHaveBeenCalled();
  });

  it("receiver with empty rfc → 200 (RFC not required for a draft preview, only for real stamping)", async () => {
    const controller = buildController();
    const bodyWithoutRfc = { ...VALID_PREVIEW_BODY, receiver: { ...VALID_PREVIEW_BODY.receiver, rfc: "" } };

    const res = await controller.previewPdf(previewReq(bodyWithoutRfc));

    expect(res.status).toBe(200);
    expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
  });

  it("renderToBuffer failure → 500 with JSON error body, not an unhandled exception", async () => {
    const controller = buildController();
    mockRenderToBuffer.mockRejectedValueOnce(new Error("boom"));

    const res = await controller.previewPdf(previewReq(VALID_PREVIEW_BODY));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("resolves issuer fiscal data server-side via EmitterFiscalSettings, ignoring any client-supplied rfc/fiscalRegime/zipCode", async () => {
    mockedGetEmitter.mockResolvedValue({
      rfc: "AGR010101AB1",
      legalName: "Agrisas SA de CV",
      fiscalRegime: "601",
      zipCode: "83000",
    });
    const controller = buildController();
    const bodyWithForgedIssuer = {
      ...VALID_PREVIEW_BODY,
      issuer: { ...VALID_PREVIEW_BODY.issuer, rfc: "FAKE010101AAA", fiscalRegime: "999", zipCode: "00000" },
    };

    await controller.previewPdf(previewReq(bodyWithForgedIssuer));

    expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    const element = mockRenderToBuffer.mock.calls[0][0] as unknown as {
      props: { data: { issuer: { rfc: string | null; fiscalRegime: string | null; zipCode: string | null } } };
    };
    expect(element.props.data.issuer.rfc).toBe("AGR010101AB1");
    expect(element.props.data.issuer.fiscalRegime).toBe("601");
    expect(element.props.data.issuer.zipCode).toBe("83000");
  });

  it("EmitterFiscalSettings/TicketSettings empty and no CSD loaded → issuer fields render null, still 200 (never invents data)", async () => {
    mockedGetEmitter.mockResolvedValue(null);
    const controller = buildController();

    const res = await controller.previewPdf(previewReq(VALID_PREVIEW_BODY));

    expect(res.status).toBe(200);
    const element = mockRenderToBuffer.mock.calls[0][0] as unknown as {
      props: { data: { issuer: { rfc: string | null } } };
    };
    expect(element.props.data.issuer.rfc).toBeNull();
  });
});

describe("BillingController — getEmitterFiscalSettings", () => {
  beforeEach(() => {
    mockedGetEmitter.mockReset();
  });

  function emitterReq(): NextRequest {
    return new NextRequest("http://localhost/api/v1/admin/billing/emitter-fiscal-settings", {
      method: "GET",
      headers: { "x-user-id": USER_ID },
    });
  }

  it("with billing:write → 200 with the 5 fiscal fields, falling back to EmitterFiscalSettings when no CSD is loaded", async () => {
    mockedGetEmitter.mockResolvedValue({
      rfc: "AGR010101AB1",
      legalName: "Agrisas SA de CV",
      fiscalRegime: "601",
      zipCode: "83000",
      address: "Dirección de prueba, Culiacán, Sinaloa",
    });
    const controller = buildController();
    const gatewaySpy = jest.spyOn(FakeFacturamaGateway.prototype, "getCsdStatus");

    const res = await controller.getEmitterFiscalSettings(emitterReq());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      rfc: "AGR010101AB1",
      legalName: "Agrisas SA de CV",
      fiscalRegime: "601",
      zipCode: "83000",
      address: "Dirección de prueba, Culiacán, Sinaloa",
      email: null,
    });
    // Cascade always attempts the CSD tier first — this controller's gateway has no CSD
    // uploaded, so it resolves with an empty rfc and the cascade falls through to EmitterFiscalSettings.
    expect(gatewaySpy).toHaveBeenCalled();
    gatewaySpy.mockRestore();
  });

  it("nothing captured anywhere (no CSD, no EmitterFiscalSettings, no TicketSettings) → 200 with all fields null", async () => {
    mockedGetEmitter.mockResolvedValue(null);
    const controller = buildController();

    const res = await controller.getEmitterFiscalSettings(emitterReq());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ rfc: null, legalName: null, fiscalRegime: null, zipCode: null, address: null, email: null });
  });

  it("falls through to TicketSettings when EmitterFiscalSettings is empty and no CSD is loaded", async () => {
    mockedGetEmitter.mockResolvedValue(null);
    const ticketRepo = new InMemoryTicketSettingsRepository();
    await ticketRepo.update({
      businessName: "IVAN ENRIQUE OLIVERA RAMIREZ",
      businessRfc: "OIRI8506123Y7",
      businessAddress: "LIBRES # 105 CENTRO, OCOTLAN DE MORELOS, OAXACA. C.P. 71510",
      businessTaxRegime: "612 Personas Físicas con Actividad Empresarial",
    });
    const controller = buildController(undefined, ticketRepo);

    const res = await controller.getEmitterFiscalSettings(emitterReq());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      rfc: "OIRI8506123Y7",
      legalName: "IVAN ENRIQUE OLIVERA RAMIREZ",
      fiscalRegime: "612",
      zipCode: null,
      address: "LIBRES # 105 CENTRO, OCOTLAN DE MORELOS, OAXACA. C.P. 71510",
      email: null,
    });
  });

  it("without billing:write → 403", async () => {
    const controller = buildController(makeAuthz({ userCan: jest.fn().mockResolvedValue(false) }));

    const res = await controller.getEmitterFiscalSettings(emitterReq());

    expect(res.status).toBe(403);
  });
});

describe("BillingController — getById resolves SAT catalog descriptions", () => {
  const INVOICE_ID = "12345678-1234-1234-1234-123456789012";

  function buildControllerWithSeededCatalogs(branchName: string | null = null) {
    const repo = new InMemoryInvoiceRepository();
    const gateway = new FakeFacturamaGateway();
    const authz = makeAuthz();
    const lookup = makeLookup();
    lookup.findBranch = jest.fn().mockResolvedValue(branchName ? { id: "branch-1", code: "MATRIZ", name: branchName, address: null } : null);
    const downloadUseCase = new DownloadInvoiceFileUseCase(repo, gateway);
    const mailer = { send: jest.fn().mockResolvedValue(undefined) };

    const taxRegimeRepo = new InMemorySatTaxRegimeRepository();
    taxRegimeRepo.seed([{ code: "601", description: "General de Ley Personas Morales" }]);
    const cfdiUseRepo = new InMemorySatCfdiUseRepository();
    cfdiUseRepo.seed([{ code: "G03", description: "Gastos en general" }]);
    const satCodeRepo = new InMemorySatCodeRepository();
    satCodeRepo.seed([{ code: "21102300", description: "Rafia" }]);

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
      new SendInvoiceEmailUseCase(repo, lookup, downloadUseCase, mailer),
      new GetTicketSettingsUseCase(new InMemoryTicketSettingsRepository()),
      new GetEmitterFiscalSettingsUseCase(gateway),
      new SearchSatTaxRegimesUseCase(taxRegimeRepo),
      new SearchSatCfdiUsesUseCase(cfdiUseRepo),
      new SearchSatCodesUseCase(satCodeRepo),
      gateway,
    );
    return { controller, repo };
  }

  function getByIdReq(): NextRequest {
    return new NextRequest(`http://localhost/api/v1/admin/invoices/${INVOICE_ID}`, {
      method: "GET",
      headers: { "x-user-id": USER_ID },
    });
  }

  it("resolves known codes to 'code - description' for issuer and receiver", async () => {
    const { controller, repo } = buildControllerWithSeededCatalogs();
    await repo.createStamped({
      id: INVOICE_ID,
      uuid: "AAA-BBB",
      facturamaCfdiId: "cfdi-1",
      status: "stamped",
      cfdiType: "I",
      cfdiUse: "G03",
      paymentForm: "01",
      paymentMethod: "PUE",
      receiverRfc: "XAXX010101000",
      receiverName: "Cliente",
      receiverCfdiUse: "G03",
      receiverFiscalRegime: "601",
      receiverTaxZipCode: "45010",
      issuerRfc: "AGR010101AB1",
      issuerLegalName: "Agrisas",
      issuerFiscalRegime: "601",
      issuerZipCode: "83000",
      issuerAddress: "Calle Falsa 123",
      issuerEmail: null,
      currency: "MXN",
      subtotal: 100,
      taxTotal: 16,
      total: 116,
      xmlUrl: null,
      pdfUrl: null,
      saleId: null,
      branchId: "branch-1",
      customerId: null,
      creatorId: "creator-1",
      items: [],
    });

    const res = await controller.getById(getByIdReq(), INVOICE_ID);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.issuerFiscalRegimeLabel).toBe("601 - General de Ley Personas Morales");
    expect(body.receiverFiscalRegimeLabel).toBe("601 - General de Ley Personas Morales");
    expect(body.receiverCfdiUseLabel).toBe("G03 - Gastos en general");
  });

  it("resolves each item's satProductCode to 'code - description' and the issuing branch's name", async () => {
    const { controller, repo } = buildControllerWithSeededCatalogs("Sucursal Matriz");
    await repo.createStamped({
      id: INVOICE_ID,
      uuid: "AAA-BBB",
      facturamaCfdiId: "cfdi-1",
      status: "stamped",
      cfdiType: "I",
      cfdiUse: "G03",
      paymentForm: "01",
      paymentMethod: "PUE",
      receiverRfc: "XAXX010101000",
      receiverName: "Cliente",
      receiverCfdiUse: "G03",
      receiverFiscalRegime: "601",
      receiverTaxZipCode: "45010",
      issuerRfc: "AGR010101AB1",
      issuerLegalName: "Agrisas",
      issuerFiscalRegime: "601",
      issuerZipCode: "83000",
      issuerAddress: "Calle Falsa 123",
      issuerEmail: null,
      currency: "MXN",
      subtotal: 100,
      taxTotal: 16,
      total: 116,
      xmlUrl: null,
      pdfUrl: null,
      saleId: null,
      branchId: "branch-1",
      customerId: null,
      creatorId: "creator-1",
      items: [
        {
          id: "item-1",
          productId: null,
          productCodeSnapshot: "RAF",
          productNameSnapshot: "Rafia gruesa",
          satProductCode: "21102300",
          satUnitCode: "H87",
          unit: "PZA",
          quantity: 1,
          unitPrice: 100,
          discountPct: null,
          ivaRate: 0.16,
          iepsRate: 0,
          taxObject: "02",
          lineSubtotal: 100,
          lineIva: 16,
          lineIeps: 0,
          lineTotal: 116,
        },
      ],
    });

    const res = await controller.getById(getByIdReq(), INVOICE_ID);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.issuerBranchName).toBe("Sucursal Matriz");
    expect(body.items[0].satProductCodeLabel).toBe("21102300 - Rafia");
  });

  it("item's satProductCodeLabel falls back to the raw code when it has no catalog match", async () => {
    const { controller, repo } = buildControllerWithSeededCatalogs();
    await repo.createStamped({
      id: INVOICE_ID,
      uuid: "AAA-BBB",
      facturamaCfdiId: "cfdi-1",
      status: "stamped",
      cfdiType: "I",
      cfdiUse: "G03",
      paymentForm: "01",
      paymentMethod: "PUE",
      receiverRfc: "XAXX010101000",
      receiverName: "Cliente",
      receiverCfdiUse: "G03",
      receiverFiscalRegime: "601",
      receiverTaxZipCode: "45010",
      issuerRfc: "AGR010101AB1",
      issuerLegalName: "Agrisas",
      issuerFiscalRegime: "601",
      issuerZipCode: "83000",
      issuerAddress: "Calle Falsa 123",
      issuerEmail: null,
      currency: "MXN",
      subtotal: 100,
      taxTotal: 16,
      total: 116,
      xmlUrl: null,
      pdfUrl: null,
      saleId: null,
      branchId: "branch-1",
      customerId: null,
      creatorId: "creator-1",
      items: [
        {
          id: "item-1",
          productId: null,
          productCodeSnapshot: "XXX",
          productNameSnapshot: "Producto sin catálogo",
          satProductCode: "99999999",
          satUnitCode: "H87",
          unit: "PZA",
          quantity: 1,
          unitPrice: 100,
          discountPct: null,
          ivaRate: 0.16,
          iepsRate: 0,
          taxObject: "02",
          lineSubtotal: 100,
          lineIva: 16,
          lineIeps: 0,
          lineTotal: 116,
        },
      ],
    });

    const res = await controller.getById(getByIdReq(), INVOICE_ID);
    const body = await res.json();
    expect(body.items[0].satProductCodeLabel).toBe("99999999");
    expect(body.issuerBranchName).toBeNull();
  });

  it("issuer label is null when the invoice has no issuer snapshot (pre-migration invoice)", async () => {
    const { controller, repo } = buildControllerWithSeededCatalogs();
    await repo.createStamped({
      id: INVOICE_ID,
      uuid: "AAA-BBB",
      facturamaCfdiId: "cfdi-1",
      status: "stamped",
      cfdiType: "I",
      cfdiUse: "G03",
      paymentForm: "01",
      paymentMethod: "PUE",
      receiverRfc: "XAXX010101000",
      receiverName: "Cliente",
      receiverCfdiUse: "G03",
      receiverFiscalRegime: "601",
      receiverTaxZipCode: "45010",
      issuerRfc: null,
      issuerLegalName: null,
      issuerFiscalRegime: null,
      issuerZipCode: null,
      issuerAddress: null,
      issuerEmail: null,
      currency: "MXN",
      subtotal: 100,
      taxTotal: 16,
      total: 116,
      xmlUrl: null,
      pdfUrl: null,
      saleId: null,
      branchId: "branch-1",
      customerId: null,
      creatorId: "creator-1",
      items: [],
    });

    const res = await controller.getById(getByIdReq(), INVOICE_ID);

    const body = await res.json();
    expect(body.issuerFiscalRegimeLabel).toBeNull();
  });

  it("unknown code falls back to the raw code", async () => {
    const { controller, repo } = buildControllerWithSeededCatalogs();
    await repo.createStamped({
      id: INVOICE_ID,
      uuid: "AAA-BBB",
      facturamaCfdiId: "cfdi-1",
      status: "stamped",
      cfdiType: "I",
      cfdiUse: "G99",
      paymentForm: "01",
      paymentMethod: "PUE",
      receiverRfc: "XAXX010101000",
      receiverName: "Cliente",
      receiverCfdiUse: "G99",
      receiverFiscalRegime: "999",
      receiverTaxZipCode: "45010",
      issuerRfc: null,
      issuerLegalName: null,
      issuerFiscalRegime: null,
      issuerZipCode: null,
      issuerAddress: null,
      issuerEmail: null,
      currency: "MXN",
      subtotal: 100,
      taxTotal: 16,
      total: 116,
      xmlUrl: null,
      pdfUrl: null,
      saleId: null,
      branchId: "branch-1",
      customerId: null,
      creatorId: "creator-1",
      items: [],
    });

    const res = await controller.getById(getByIdReq(), INVOICE_ID);

    const body = await res.json();
    expect(body.receiverFiscalRegimeLabel).toBe("999");
    expect(body.receiverCfdiUseLabel).toBe("G99");
  });
});
