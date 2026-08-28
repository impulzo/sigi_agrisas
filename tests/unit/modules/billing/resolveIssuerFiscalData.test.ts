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

jest.mock("@/shared/infrastructure/emitter/emitterFiscalSettingsStore", () => ({
  getEmitterFiscalSettings: jest.fn(),
}));

import { getEmitterFiscalSettings } from "@/shared/infrastructure/emitter/emitterFiscalSettingsStore";
import { extractSatCodeFromTicketRegime } from "../../../../src/modules/billing/application/services/resolveIssuerFiscalData";
import { GetEmitterFiscalSettingsUseCase } from "../../../../src/modules/billing/application/use-cases/GetEmitterFiscalSettingsUseCase";
import { FakeFacturamaGateway } from "../../../../src/modules/billing/infrastructure/services/FakeFacturamaGateway";
import { GetTicketSettingsUseCase } from "../../../../src/modules/settings/application/use-cases/GetTicketSettingsUseCase";
import { InMemoryTicketSettingsRepository } from "../../../../src/modules/settings/infrastructure/repositories/InMemoryTicketSettingsRepository";

const mockedGetEmitterFiscalSettings = getEmitterFiscalSettings as jest.Mock;

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
    const uc = new GetEmitterFiscalSettingsUseCase(gateway, getTicketSettingsUseCase);

    const result = await uc.execute();

    expect(result.fiscalRegime).toBe("612");
  });
});
