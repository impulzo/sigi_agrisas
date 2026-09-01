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

jest.mock("@/shared/infrastructure/emitter/emitterFiscalSettingsStore", () => ({
  getEmitterFiscalSettings: jest.fn().mockResolvedValue(null),
}));

import { FakeFacturamaGateway } from "../../../../src/modules/billing/infrastructure/services/FakeFacturamaGateway";
import { GetTicketSettingsUseCase } from "../../../../src/modules/settings/application/use-cases/GetTicketSettingsUseCase";
import { InMemoryTicketSettingsRepository } from "../../../../src/modules/settings/infrastructure/repositories/InMemoryTicketSettingsRepository";
import { getEmitterFiscalSettings } from "@/shared/infrastructure/emitter/emitterFiscalSettingsStore";
import type { SatCodeSearchUseCase } from "../../../../src/modules/billing/application/services/resolveSatDescription";

const mockRenderToBuffer = renderToBuffer as jest.MockedFunction<typeof renderToBuffer>;
const mockGetEmitterFiscalSettings = getEmitterFiscalSettings as jest.MockedFunction<typeof getEmitterFiscalSettings>;

function fakeSatSearch(items: Array<{ code: string; description: string }>): SatCodeSearchUseCase {
  return { execute: jest.fn().mockResolvedValue({ items }) };
}

const STAMP_INPUT = {
  currency: "MXN",
  paymentForm: "01",
  paymentMethod: "PUE",
  expeditionPlace: "45010",
  cfdiType: "I" as const,
  receiver: {
    rfc: "CAN850101AAA",
    name: "Cliente",
    cfdiUse: "G03",
    fiscalRegime: "601",
    taxZipCode: "45010",
  },
  items: [],
};

const STAMP_INPUT_WITH_ITEMS = {
  ...STAMP_INPUT,
  items: [
    {
      productCode: "01010101",
      identificationNumber: "PROD-1",
      description: "Fertilizante Foliar",
      unit: "PZA",
      satUnitCode: "H87",
      quantity: 2,
      unitPrice: 150,
      subtotal: 300,
      taxes: [{ type: "IVA" as const, rate: 0.16, base: 300, total: 48, isRetention: false }],
      taxObject: "02",
      total: 348,
    },
  ],
};

describe("FakeFacturamaGateway", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRenderToBuffer.mockResolvedValue(Buffer.from("%PDF-1.4 mock"));
  });

  it("stamp returns non-empty cfdiId and uuid (deterministic unique each call)", async () => {
    const gw = new FakeFacturamaGateway();

    const r1 = await gw.stamp(STAMP_INPUT);
    const r2 = await gw.stamp(STAMP_INPUT);

    expect(r1.cfdiId).toBeTruthy();
    expect(r1.uuid).toBeTruthy();
    expect(r1.cfdiId).not.toBe(r2.cfdiId);
  });

  it("stamp does not make network calls — no fetch required", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockRejectedValue(new Error("no network"));
    const gw = new FakeFacturamaGateway();

    const result = await gw.stamp(STAMP_INPUT);

    expect(result.uuid).toBeTruthy();
    fetchSpy.mockRestore();
  });

  it("download returns base64 content with correct contentType", async () => {
    const gw = new FakeFacturamaGateway();

    const pdf = await gw.download("pdf", "fake-id");
    const xml = await gw.download("xml", "fake-id");

    expect(pdf.contentBase64).toBeTruthy();
    expect(pdf.contentType).toBe("application/pdf");
    expect(xml.contentBase64).toBeTruthy();
    expect(xml.contentType).toBe("application/xml");
  });

  it("download('pdf') after stamp renders InvoiceDocumentPdf with the receiver RFC and a concept from the stamped input", async () => {
    const gw = new FakeFacturamaGateway();
    const { cfdiId } = await gw.stamp(STAMP_INPUT_WITH_ITEMS);

    await gw.download("pdf", cfdiId);

    expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    const element = mockRenderToBuffer.mock.calls[0][0] as unknown as { props: { data: { receiver: { rfc: string }; lines: { description: string }[] } } };
    expect(element.props.data.receiver.rfc).toBe(STAMP_INPUT_WITH_ITEMS.receiver.rfc);
    expect(element.props.data.lines.map((l) => l.description)).toContain("Fertilizante Foliar");
  });

  it("download('pdf') with an unknown cfdiId does not throw and renders the fallback data", async () => {
    const gw = new FakeFacturamaGateway();

    const result = await gw.download("pdf", "never-stamped-id");

    expect(result.contentBase64).toBeTruthy();
    expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    const element = mockRenderToBuffer.mock.calls[0][0] as unknown as { props: { data: { lines: unknown[] } } };
    expect(element.props.data.lines.length).toBeGreaterThan(0);
  });

  it("download('pdf') includes the resolved logoUrl when GetTicketSettingsUseCase is injected", async () => {
    const settingsRepo = new InMemoryTicketSettingsRepository();
    await settingsRepo.updateLogoUrl("https://storage.example.com/tenant-logo.png");
    const gw = new FakeFacturamaGateway(new GetTicketSettingsUseCase(settingsRepo));

    await gw.download("pdf", "never-stamped-id");

    const element = mockRenderToBuffer.mock.calls[0][0] as unknown as { props: { data: { issuer: { logoUrl: string | null } } } };
    expect(element.props.data.issuer.logoUrl).toBe("https://storage.example.com/tenant-logo.png");
  });

  it("download('pdf') resolves SAT descriptions and the issuer address when the search use cases are injected", async () => {
    mockGetEmitterFiscalSettings.mockResolvedValueOnce({
      rfc: "AGR010101AB1",
      legalName: "Agrisas SA de CV",
      fiscalRegime: "601",
      zipCode: "83000",
      address: "Av. Álvaro Obregón 123, Culiacán, Sinaloa",
    });
    const searchSatTaxRegimesUseCase = fakeSatSearch([{ code: "601", description: "General de Ley Personas Morales" }]);
    const searchSatCfdiUsesUseCase = fakeSatSearch([{ code: "G03", description: "Gastos en general" }]);
    const gw = new FakeFacturamaGateway(undefined, searchSatTaxRegimesUseCase, searchSatCfdiUsesUseCase);
    const { cfdiId } = await gw.stamp(STAMP_INPUT_WITH_ITEMS);

    await gw.download("pdf", cfdiId);

    const element = mockRenderToBuffer.mock.calls[0][0] as unknown as {
      props: {
        data: {
          issuer: { fiscalRegimeLabel?: string | null; address?: string | null };
          receiver: { fiscalRegimeLabel?: string | null; cfdiUseLabel?: string | null };
        };
      };
    };
    expect(element.props.data.issuer.fiscalRegimeLabel).toBe("601 - General de Ley Personas Morales");
    expect(element.props.data.issuer.address).toBe("Av. Álvaro Obregón 123, Culiacán, Sinaloa");
    expect(element.props.data.receiver.fiscalRegimeLabel).toBe("601 - General de Ley Personas Morales");
    expect(element.props.data.receiver.cfdiUseLabel).toBe("G03 - Gastos en general");
  });

  it("download('pdf') without the optional dependency behaves as before (no logo, no error)", async () => {
    const gw = new FakeFacturamaGateway();

    const result = await gw.download("pdf", "never-stamped-id");

    expect(result.contentBase64).toBeTruthy();
    const element = mockRenderToBuffer.mock.calls[0][0] as unknown as { props: { data: { issuer: { logoUrl: string | null } } } };
    expect(element.props.data.issuer.logoUrl).toBeNull();
  });

  it("download('xml') after stamp includes the receiver RFC and a concept description", async () => {
    const gw = new FakeFacturamaGateway();
    const { cfdiId } = await gw.stamp(STAMP_INPUT_WITH_ITEMS);

    const xml = await gw.download("xml", cfdiId);
    const decoded = Buffer.from(xml.contentBase64, "base64").toString("utf-8");

    expect(decoded).toContain(STAMP_INPUT_WITH_ITEMS.receiver.rfc);
    expect(decoded).toContain("Fertilizante Foliar");
    expect(decoded).toContain('Version="4.0"');
    expect(decoded).toContain('NoCertificado="FAKE"');
  });

  it("uploadCsd returns mocked status with isValid=true", async () => {
    const gw = new FakeFacturamaGateway();

    const status = await gw.uploadCsd({
      rfc: "CAN850101AAA",
      certificateBase64: "base64cer",
      privateKeyBase64: "base64key",
      privateKeyPassword: "secret",
    });

    expect(status.isValid).toBe(true);
    expect(status.rfc).toBe("CAN850101AAA");
  });

  it("cancel resolves successfully", async () => {
    const gw = new FakeFacturamaGateway();
    const result = await gw.cancel("any-id", "02");
    expect(result.success).toBe(true);
  });

  it("getCsdStatus resolves gracefully with an empty rfc when no CSD was uploaded — does NOT throw", async () => {
    const gw = new FakeFacturamaGateway();
    await expect(gw.getCsdStatus()).resolves.toEqual({ rfc: "", isValid: false });
  });

  it("getCsdStatus reflects a successful uploadCsd on the same gateway instance", async () => {
    const gw = new FakeFacturamaGateway();
    await gw.uploadCsd({
      rfc: "CAN850101AAA",
      certificateBase64: "base64cer",
      privateKeyBase64: "base64key",
      privateKeyPassword: "secret",
    });

    const status = await gw.getCsdStatus();

    expect(status.isValid).toBe(true);
    expect(status.rfc).toBe("FAKE");
  });
});
