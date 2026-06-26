import { StampInvoiceUseCase } from "../../../../src/modules/billing/application/use-cases/StampInvoiceUseCase";
import { InMemoryInvoiceRepository } from "../../../../src/modules/billing/infrastructure/repositories/InMemoryInvoiceRepository";
import { FakeFacturamaGateway } from "../../../../src/modules/billing/infrastructure/services/FakeFacturamaGateway";
import {
  SaleNotInvoiceableError,
  SaleAlreadyInvoicedError,
  ReceiverFiscalDataIncompleteError,
} from "../../../../src/modules/billing/domain/errors";
import type { BillingLookupService, SaleForBilling } from "../../../../src/modules/billing/application/ports/BillingLookupService";

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
  };
}

describe("StampInvoiceUseCase", () => {
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
      expect(invoice.total).toBeCloseTo(116, 2);
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
  });
});
