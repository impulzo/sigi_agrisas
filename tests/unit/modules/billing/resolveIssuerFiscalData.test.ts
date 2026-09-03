// @react-pdf/renderer is a server-only ESM lib; mock it for the node test env
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

import { extractSatCodeFromTicketRegime, resolveIssuerFiscalData } from "../../../../src/modules/billing/application/services/resolveIssuerFiscalData";
import { GetEmitterFiscalSettingsUseCase } from "../../../../src/modules/billing/application/use-cases/GetEmitterFiscalSettingsUseCase";
import { FakeFacturamaGateway } from "../../../../src/modules/billing/infrastructure/services/FakeFacturamaGateway";
import { GetTicketSettingsUseCase } from "../../../../src/modules/settings/application/use-cases/GetTicketSettingsUseCase";
import { InMemoryTicketSettingsRepository } from "../../../../src/modules/settings/infrastructure/repositories/InMemoryTicketSettingsRepository";
import type { EmitterFiscalSettingsStore } from "../../../../src/modules/billing/application/ports/EmitterFiscalSettingsStore";

const store: EmitterFiscalSettingsStore = {
  get: jest.fn(),
  upsert: jest.fn(),
};
const mockedGetEmitterFiscalSettings = store.get as jest.Mock;

describe("extractSatCodeFromTicketRegime", () => {
  it("extracts the leading SAT code when businessTaxRegime uses the form's em-dash format", () => {
    expect(extractSatCodeFromTicketRegime("612 — Personas Físicas con Actividad Empresarial")).toBe("612");
  });

  it("extracts the leading SAT code when businessTaxRegime uses a plain-space separator (seeded/legacy data)", () => {
    expect(extractSatCodeFromTicketRegime("612 Personas Físicas con Actividad Empresarial")).toBe("612");
  });

  it("returns the bare code as-is when it already fits the column constraint", () => {
    expect(extractSatCodeFromTicketRegime("601")).toBe("601");
  });

  it("returns null when there is no leading numeric code — never truncates the description", () => {
    expect(extractSatCodeFromTicketRegime("Personas Físicas con Actividad Empresarial")).toBeNull();
  });

  it("returns null when businessTaxRegime is null", () => {
    expect(extractSatCodeFromTicketRegime(null)).toBeNull();
  });
});

describe("GetEmitterFiscalSettingsUseCase — draft-preview/stamp consistency", () => {
  beforeEach(() => {
    mockedGetEmitterFiscalSettings.mockReset();
    mockedGetEmitterFiscalSettings.mockResolvedValue(null);
  });

  it("resolves the same parsed SAT code the stamping flow would persist, when only TicketSettings has data", async () => {
    const ticketRepo = new InMemoryTicketSettingsRepository();
    await ticketRepo.update({ businessTaxRegime: "612 Personas Físicas con Actividad Empresarial" });
    const getTicketSettingsUseCase = new GetTicketSettingsUseCase(ticketRepo);
    const gateway = new FakeFacturamaGateway();
    const uc = new GetEmitterFiscalSettingsUseCase(gateway, getTicketSettingsUseCase, store);

    const result = await uc.execute();

    expect(result.fiscalRegime).toBe("612");
  });
});

describe("resolveIssuerFiscalData — zipCode 3rd-tier fallback to TicketSettings", () => {
  beforeEach(() => {
    mockedGetEmitterFiscalSettings.mockReset();
  });

  it("falls through to TicketSettings.businessZipCode when EmitterFiscalSettings has none and no CSD is loaded", async () => {
    mockedGetEmitterFiscalSettings.mockResolvedValue(null);
    const ticketRepo = new InMemoryTicketSettingsRepository();
    await ticketRepo.update({ businessZipCode: "83000" });
    const getTicketSettingsUseCase = new GetTicketSettingsUseCase(ticketRepo);
    const gateway = new FakeFacturamaGateway();

    const result = await resolveIssuerFiscalData(gateway, getTicketSettingsUseCase, store);

    expect(result.zipCode).toBe("83000");
  });

  it("resolves zipCode to null when neither EmitterFiscalSettings nor TicketSettings have it", async () => {
    mockedGetEmitterFiscalSettings.mockResolvedValue(null);
    const ticketRepo = new InMemoryTicketSettingsRepository();
    const getTicketSettingsUseCase = new GetTicketSettingsUseCase(ticketRepo);
    const gateway = new FakeFacturamaGateway();

    const result = await resolveIssuerFiscalData(gateway, getTicketSettingsUseCase, store);

    expect(result.zipCode).toBeNull();
  });

  it("EmitterFiscalSettings.zipCode still wins over TicketSettings when both are present", async () => {
    mockedGetEmitterFiscalSettings.mockResolvedValue({
      rfc: null,
      legalName: null,
      fiscalRegime: null,
      zipCode: "01000",
      address: null,
    });
    const ticketRepo = new InMemoryTicketSettingsRepository();
    await ticketRepo.update({ businessZipCode: "83000" });
    const getTicketSettingsUseCase = new GetTicketSettingsUseCase(ticketRepo);
    const gateway = new FakeFacturamaGateway();

    const result = await resolveIssuerFiscalData(gateway, getTicketSettingsUseCase, store);

    expect(result.zipCode).toBe("01000");
  });
});

describe("resolveIssuerFiscalData — email (single tier, TicketSettings only)", () => {
  beforeEach(() => {
    mockedGetEmitterFiscalSettings.mockReset();
  });

  it("resolves email from TicketSettings.businessEmail when captured", async () => {
    mockedGetEmitterFiscalSettings.mockResolvedValue(null);
    const ticketRepo = new InMemoryTicketSettingsRepository();
    await ticketRepo.update({ businessEmail: "contacto@agrisas.mx" });
    const getTicketSettingsUseCase = new GetTicketSettingsUseCase(ticketRepo);
    const gateway = new FakeFacturamaGateway();

    const result = await resolveIssuerFiscalData(gateway, getTicketSettingsUseCase, store);

    expect(result.email).toBe("contacto@agrisas.mx");
  });

  it("resolves email to null when TicketSettings.businessEmail is not captured — no CSD/EmitterFiscalSettings tier exists for it", async () => {
    mockedGetEmitterFiscalSettings.mockResolvedValue({
      rfc: "AGR010101AB1",
      legalName: "Agrisas SA de CV",
      fiscalRegime: "601",
      zipCode: "83000",
      address: "Calle Falsa 123",
    });
    const ticketRepo = new InMemoryTicketSettingsRepository();
    const getTicketSettingsUseCase = new GetTicketSettingsUseCase(ticketRepo);
    const gateway = new FakeFacturamaGateway();

    const result = await resolveIssuerFiscalData(gateway, getTicketSettingsUseCase, store);

    expect(result.email).toBeNull();
  });
});
