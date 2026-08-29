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
import { StampInvoiceUseCase } from "../../../../src/modules/billing/application/use-cases/StampInvoiceUseCase";
import { InMemoryInvoiceRepository } from "../../../../src/modules/billing/infrastructure/repositories/InMemoryInvoiceRepository";
import { FakeFacturamaGateway } from "../../../../src/modules/billing/infrastructure/services/FakeFacturamaGateway";
import {
  SaleNotInvoiceableError,
  SaleAlreadyInvoicedError,
  ReceiverFiscalDataIncompleteError,
} from "../../../../src/modules/billing/domain/errors";
import type { BillingLookupService, SaleForBilling } from "../../../../src/modules/billing/application/ports/BillingLookupService";
import { GetTicketSettingsUseCase } from "../../../../src/modules/settings/application/use-cases/GetTicketSettingsUseCase";
import { InMemoryTicketSettingsRepository } from "../../../../src/modules/settings/infrastructure/repositories/InMemoryTicketSettingsRepository";

const mockedGetEmitterFiscalSettings = getEmitterFiscalSettings as jest.Mock;

const EMITTER = {
  rfc: "AGR010101AB1",
  legalName: "Agrisas SA de CV",
  fiscalRegime: "601",
  zipCode: "83000",
  address: "Av. Siempre Viva 742, Culiacán, Sinaloa",
};

const BRANCH_ID = "branch-uuid-1";
const CREATOR_ID = "creator-uuid-1";
const SALE_ID = "sale-uuid-1";
const CUSTOMER_ID = "customer-uuid-1";

const CUSTOMER = {
  id: CUSTOMER_ID,
  name: "Cliente Ejemplo SA",
  legalName: "Cliente Ejemplo SA de CV",
  rfc: "CAN850101AAA",
  taxRegime: "601",
  cfdiUse: "G03",
  taxZipCode: "45010",
  email: "cliente@ejemplo.com",
};

function makeSale(overrides: Partial<SaleForBilling> = {}): SaleForBilling {
  return {
    id: SALE_ID,
    status: "completed",
    branchId: BRANCH_ID,
    customerId: CUSTOMER_ID,
    paymentMethodId: "pm-uuid-1",
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    items: [
      {
        id: "item-uuid-1",
        productId: "prod-uuid-1",
        productCodeSnapshot: "PROD001",
        productNameSnapshot: "Producto Ejemplo",
        satProductCode: "10171600",
        quantity: 1,
        unitPrice: 100,
        discountPct: null,
        ivaRate: 0.16,
        iepsRate: null,
        lineSubtotal: 100,
        lineTotal: 116,
      },
    ],
    ...overrides,
  };
}

function makeLookup(sale: SaleForBilling | null = makeSale()): BillingLookupService {
  return {
    findSaleWithItems: jest.fn().mockResolvedValue(sale),
    findCustomer: jest.fn().mockResolvedValue(CUSTOMER),
    findBranch: jest.fn().mockResolvedValue({ id: BRANCH_ID, code: "MATRIZ", name: "Matriz", address: "45010" }),
    findHeadquarters: jest.fn().mockResolvedValue({ id: BRANCH_ID, code: "MATRIZ", name: "Matriz", address: "45010" }),
  };
}

describe("StampInvoiceUseCase", () => {
  beforeEach(() => {
    mockedGetEmitterFiscalSettings.mockReset();
    mockedGetEmitterFiscalSettings.mockResolvedValue(EMITTER);
  });

  describe("sale-linked", () => {
    it("stamps from completed sale — creates invoice with saleId", async () => {
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup);

      const invoice = await uc.execute(
        { type: "sale", saleId: SALE_ID },
        CREATOR_ID,
        BRANCH_ID
      );

      expect(invoice.saleId).toBe(SALE_ID);
      expect(invoice.status).toBe("stamped");
      expect(invoice.uuid).toBeTruthy();
      expect(invoice.facturamaCfdiId).toBeTruthy();
      expect(invoice.receiverRfc).toBe("CAN850101AAA");
      expect(invoice.items).toHaveLength(1);
    });

    it("does NOT modify inventory — no inventory calls", async () => {
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup);

      await uc.execute({ type: "sale", saleId: SALE_ID }, CREATOR_ID, BRANCH_ID);

      // Only lookup methods called — no inventory repo
      expect(lookup.findSaleWithItems).toHaveBeenCalledWith(SALE_ID);
      expect(lookup.findCustomer).toHaveBeenCalledWith(CUSTOMER_ID);
    });

    it("sale not found → SaleNotInvoiceableError", async () => {
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const lookup = makeLookup(null);
      const uc = new StampInvoiceUseCase(repo, gateway, lookup);

      await expect(
        uc.execute({ type: "sale", saleId: SALE_ID }, CREATOR_ID, BRANCH_ID)
      ).rejects.toThrow(SaleNotInvoiceableError);
    });

    it("sale not completed → SaleNotInvoiceableError", async () => {
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const lookup = makeLookup(makeSale({ status: "cancelled" }));
      const uc = new StampInvoiceUseCase(repo, gateway, lookup);

      await expect(
        uc.execute({ type: "sale", saleId: SALE_ID }, CREATOR_ID, BRANCH_ID)
      ).rejects.toThrow(SaleNotInvoiceableError);
    });

    it("sale already has stamped invoice → SaleAlreadyInvoicedError", async () => {
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup);

      await uc.execute({ type: "sale", saleId: SALE_ID }, CREATOR_ID, BRANCH_ID);

      await expect(
        uc.execute({ type: "sale", saleId: SALE_ID }, CREATOR_ID, BRANCH_ID)
      ).rejects.toThrow(SaleAlreadyInvoicedError);
    });

    it("receiver fiscal data incomplete → ReceiverFiscalDataIncompleteError — does NOT call gateway", async () => {
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const stampSpy = jest.spyOn(gateway, "stamp");

      const incompleteCustomer = { ...CUSTOMER, rfc: "", taxRegime: null };
      const lookup: BillingLookupService = {
        findSaleWithItems: jest.fn().mockResolvedValue(makeSale()),
        findCustomer: jest.fn().mockResolvedValue(incompleteCustomer),
        findBranch: jest.fn().mockResolvedValue({ id: BRANCH_ID, code: "MATRIZ", name: "Matriz", address: null }),
        findHeadquarters: jest.fn().mockResolvedValue({ id: BRANCH_ID, code: "MATRIZ", name: "Matriz", address: null }),
      };
      const uc = new StampInvoiceUseCase(repo, gateway, lookup);

      await expect(
        uc.execute({ type: "sale", saleId: SALE_ID }, CREATOR_ID, BRANCH_ID)
      ).rejects.toThrow(ReceiverFiscalDataIncompleteError);

      expect(stampSpy).not.toHaveBeenCalled();
    });

    it("gateway stamp error → FacturamaStampError propagated; no invoice persisted", async () => {
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      jest.spyOn(gateway, "stamp").mockRejectedValue(
        new (await import("../../../../src/modules/billing/domain/errors")).FacturamaStampError("SAT error 400")
      );
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup);

      const { FacturamaStampError } = await import("../../../../src/modules/billing/domain/errors");
      await expect(
        uc.execute({ type: "sale", saleId: SALE_ID }, CREATOR_ID, BRANCH_ID)
      ).rejects.toThrow(FacturamaStampError);

      const inRepo = await repo.list({ branchId: BRANCH_ID });
      expect(inRepo.total).toBe(0);
    });

    it("snapshots issuer fiscal data from EmitterFiscalSettings", async () => {
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup);

      const invoice = await uc.execute({ type: "sale", saleId: SALE_ID }, CREATOR_ID, BRANCH_ID);

      expect(invoice.issuerRfc).toBe(EMITTER.rfc);
      expect(invoice.issuerLegalName).toBe(EMITTER.legalName);
      expect(invoice.issuerFiscalRegime).toBe(EMITTER.fiscalRegime);
      expect(invoice.issuerZipCode).toBe(EMITTER.zipCode);
      expect(invoice.issuerAddress).toBe(EMITTER.address);
    });

    it("CSD loaded — rfc/legalName come from the certificate, fiscalRegime/zipCode/address still from EmitterFiscalSettings", async () => {
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      await gateway.uploadCsd({
        rfc: "CSD010101AB1",
        certificateBase64: "cert",
        privateKeyBase64: "key",
        privateKeyPassword: "pass",
      });
      jest.spyOn(gateway, "getCsdStatus").mockResolvedValue({
        rfc: "CSD010101AB1",
        issuer: "Emisor Certificado SA de CV",
        isValid: true,
      });
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup);

      const invoice = await uc.execute({ type: "sale", saleId: SALE_ID }, CREATOR_ID, BRANCH_ID);

      expect(invoice.issuerRfc).toBe("CSD010101AB1");
      expect(invoice.issuerLegalName).toBe("Emisor Certificado SA de CV");
      expect(invoice.issuerFiscalRegime).toBe(EMITTER.fiscalRegime);
      expect(invoice.issuerZipCode).toBe(EMITTER.zipCode);
      expect(invoice.issuerAddress).toBe(EMITTER.address);
    });

    it("CSD lookup fails — falls through to EmitterFiscalSettings for rfc/legalName too", async () => {
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      // No uploadCsd() call — getCsdStatus() resolves with an empty rfc by default (no CSD loaded).
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup);

      const invoice = await uc.execute({ type: "sale", saleId: SALE_ID }, CREATOR_ID, BRANCH_ID);

      expect(invoice.issuerRfc).toBe(EMITTER.rfc);
      expect(invoice.issuerLegalName).toBe(EMITTER.legalName);
    });

    it("stamps successfully with null issuer fields when nothing is captured anywhere — never invents data", async () => {
      mockedGetEmitterFiscalSettings.mockResolvedValue(null);
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup);

      const invoice = await uc.execute({ type: "sale", saleId: SALE_ID }, CREATOR_ID, BRANCH_ID);

      expect(invoice.status).toBe("stamped");
      expect(invoice.issuerRfc).toBeNull();
      expect(invoice.issuerLegalName).toBeNull();
      expect(invoice.issuerFiscalRegime).toBeNull();
      expect(invoice.issuerZipCode).toBeNull();
      expect(invoice.issuerAddress).toBeNull();
    });

    it("falls through to TicketSettings (business data already captured for ticket printing) when EmitterFiscalSettings is empty and no CSD is loaded", async () => {
      mockedGetEmitterFiscalSettings.mockResolvedValue(null);
      const ticketRepo = new InMemoryTicketSettingsRepository();
      await ticketRepo.update({
        businessName: "IVAN ENRIQUE OLIVERA RAMIREZ",
        businessRfc: "OIRI8506123Y7",
        businessAddress: "LIBRES # 105 CENTRO, OCOTLAN DE MORELOS, OAXACA. C.P. 71510",
        businessTaxRegime: "612 Personas Físicas con Actividad Empresarial",
        businessZipCode: "71510",
      });
      const getTicketSettingsUseCase = new GetTicketSettingsUseCase(ticketRepo);
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup, getTicketSettingsUseCase);

      const invoice = await uc.execute({ type: "sale", saleId: SALE_ID }, CREATOR_ID, BRANCH_ID);

      expect(invoice.issuerRfc).toBe("OIRI8506123Y7");
      expect(invoice.issuerLegalName).toBe("IVAN ENRIQUE OLIVERA RAMIREZ");
      // businessTaxRegime is free text ("<código> <descripción>", no reliable separator) —
      // only the leading SAT code is extracted, never the full label (would overflow
      // Invoice.issuerFiscalRegime VarChar(4) otherwise).
      expect(invoice.issuerFiscalRegime).toBe("612");
      expect(invoice.issuerAddress).toBe("LIBRES # 105 CENTRO, OCOTLAN DE MORELOS, OAXACA. C.P. 71510");
      // zipCode now has a 3rd tier too — TicketSettings.businessZipCode.
      expect(invoice.issuerZipCode).toBe("71510");
    });

    it("issuerZipCode stays null when neither EmitterFiscalSettings nor TicketSettings.businessZipCode have it", async () => {
      mockedGetEmitterFiscalSettings.mockResolvedValue(null);
      const ticketRepo = new InMemoryTicketSettingsRepository();
      await ticketRepo.update({ businessName: "Sin CP capturado" });
      const getTicketSettingsUseCase = new GetTicketSettingsUseCase(ticketRepo);
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup, getTicketSettingsUseCase);

      const invoice = await uc.execute({ type: "sale", saleId: SALE_ID }, CREATOR_ID, BRANCH_ID);

      expect(invoice.issuerZipCode).toBeNull();
    });

    it("TicketSettings businessTaxRegime with em-dash separator (form format) also resolves to just the code", async () => {
      mockedGetEmitterFiscalSettings.mockResolvedValue(null);
      const ticketRepo = new InMemoryTicketSettingsRepository();
      await ticketRepo.update({ businessTaxRegime: "612 — Personas Físicas con Actividad Empresarial" });
      const getTicketSettingsUseCase = new GetTicketSettingsUseCase(ticketRepo);
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup, getTicketSettingsUseCase);

      const invoice = await uc.execute({ type: "sale", saleId: SALE_ID }, CREATOR_ID, BRANCH_ID);

      expect(invoice.issuerFiscalRegime).toBe("612");
    });

    it("TicketSettings businessTaxRegime without a leading SAT code stamps successfully with fiscalRegime null", async () => {
      mockedGetEmitterFiscalSettings.mockResolvedValue(null);
      const ticketRepo = new InMemoryTicketSettingsRepository();
      await ticketRepo.update({ businessTaxRegime: "Régimen no capturado con código" });
      const getTicketSettingsUseCase = new GetTicketSettingsUseCase(ticketRepo);
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup, getTicketSettingsUseCase);

      const invoice = await uc.execute({ type: "sale", saleId: SALE_ID }, CREATOR_ID, BRANCH_ID);

      expect(invoice.status).toBe("stamped");
      expect(invoice.issuerFiscalRegime).toBeNull();
    });

    it("EmitterFiscalSettings still wins over TicketSettings when both are present", async () => {
      const ticketRepo = new InMemoryTicketSettingsRepository();
      await ticketRepo.update({ businessName: "Should not be used", businessRfc: "XXXX000000XXX" });
      const getTicketSettingsUseCase = new GetTicketSettingsUseCase(ticketRepo);
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup, getTicketSettingsUseCase);

      const invoice = await uc.execute({ type: "sale", saleId: SALE_ID }, CREATOR_ID, BRANCH_ID);

      expect(invoice.issuerRfc).toBe(EMITTER.rfc);
      expect(invoice.issuerLegalName).toBe(EMITTER.legalName);
    });
  });

  describe("standalone", () => {
    const standaloneInput = {
      type: "standalone" as const,
      customer: {
        rfc: "CAN850101AAA",
        name: "Cliente Ejemplo SA de CV",
        cfdiUse: "G03",
        fiscalRegime: "601",
        taxZipCode: "45010",
      },
      items: [
        {
          productCode: "PROD001",
          description: "Producto Ejemplo",
          quantity: 1,
          unitPrice: 100,
          ivaRate: 0.16,
        },
      ],
    };

    it("stamps standalone — saleId is null", async () => {
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup);

      const invoice = await uc.execute(standaloneInput, CREATOR_ID, BRANCH_ID);

      expect(invoice.saleId).toBeNull();
      expect(invoice.status).toBe("stamped");
      expect(invoice.total).toBeCloseTo(100, 2);
    });

    it("standalone does NOT modify inventory", async () => {
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup);

      await uc.execute(standaloneInput, CREATOR_ID, BRANCH_ID);

      // lookup.findSaleWithItems is NEVER called for standalone
      expect(lookup.findSaleWithItems).not.toHaveBeenCalled();
    });

    it("snapshots issuer fiscal data from EmitterFiscalSettings", async () => {
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup);

      const invoice = await uc.execute(standaloneInput, CREATOR_ID, BRANCH_ID);

      expect(invoice.issuerRfc).toBe(EMITTER.rfc);
      expect(invoice.issuerLegalName).toBe(EMITTER.legalName);
      expect(invoice.issuerFiscalRegime).toBe(EMITTER.fiscalRegime);
      expect(invoice.issuerZipCode).toBe(EMITTER.zipCode);
      expect(invoice.issuerAddress).toBe(EMITTER.address);
    });

    it("stamps successfully with null issuer fields when nothing is captured anywhere — never invents data", async () => {
      mockedGetEmitterFiscalSettings.mockResolvedValue(null);
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup);

      const invoice = await uc.execute(standaloneInput, CREATOR_ID, BRANCH_ID);

      expect(invoice.status).toBe("stamped");
      expect(invoice.issuerRfc).toBeNull();
      expect(invoice.issuerLegalName).toBeNull();
      expect(invoice.issuerFiscalRegime).toBeNull();
      expect(invoice.issuerZipCode).toBeNull();
      expect(invoice.issuerAddress).toBeNull();
    });

    it("issuer fiscal data changes later — existing invoice keeps the snapshot from when it was stamped", async () => {
      const repo = new InMemoryInvoiceRepository();
      const gateway = new FakeFacturamaGateway();
      const lookup = makeLookup();
      const uc = new StampInvoiceUseCase(repo, gateway, lookup);

      mockedGetEmitterFiscalSettings.mockResolvedValue(EMITTER);
      const firstInvoice = await uc.execute(standaloneInput, CREATOR_ID, BRANCH_ID);

      // EmitterFiscalSettings changes after the first invoice was already stamped
      // (e.g. an admin re-uploads the CSD with a new fiscal regime).
      const UPDATED_EMITTER = { ...EMITTER, fiscalRegime: "612", zipCode: "01000" };
      mockedGetEmitterFiscalSettings.mockResolvedValue(UPDATED_EMITTER);
      const secondInvoice = await uc.execute(standaloneInput, CREATOR_ID, BRANCH_ID);

      const refetchedFirstInvoice = await repo.findById(firstInvoice.id);
      expect(refetchedFirstInvoice!.issuerFiscalRegime).toBe(EMITTER.fiscalRegime);
      expect(refetchedFirstInvoice!.issuerZipCode).toBe(EMITTER.zipCode);
      expect(secondInvoice.issuerFiscalRegime).toBe(UPDATED_EMITTER.fiscalRegime);
      expect(secondInvoice.issuerZipCode).toBe(UPDATED_EMITTER.zipCode);
    });
  });
});
