import { CreateSaleUseCase } from "@/modules/pos/application/use-cases/CreateSaleUseCase";
import { SaleRepository, SaleSummary, CreateSaleData } from "@/modules/pos/application/ports/SaleRepository";
import { PosLookupService } from "@/modules/pos/application/ports/PosLookups";
import { Sale } from "@/modules/pos/domain/entities/Sale";
import { SaleItem } from "@/modules/pos/domain/entities/SaleItem";
import { EmptySaleError } from "@/modules/pos/domain/errors/EmptySaleError";
import { ProductPriceMismatchError } from "@/modules/pos/domain/errors/ProductPriceMismatchError";
import { DosificationMismatchError } from "@/modules/pos/domain/errors/DosificationMismatchError";
import { DosificationRequiresDefaultPriceError } from "@/modules/pos/domain/errors/DosificationRequiresDefaultPriceError";
import { InactiveResourceError } from "@/modules/pos/domain/errors/InactiveResourceError";
import { CustomerHasNoCreditLineError } from "@/modules/payments/domain/errors/CustomerHasNoCreditLineError";
import { CreditLimitExceededError } from "@/modules/payments/domain/errors/CreditLimitExceededError";
import { FolioScopeMismatchError } from "@/shared/domain/errors/FolioScopeMismatchError";

function makeSummary(data: CreateSaleData): SaleSummary {
  const now = new Date();
  const items = data.items.map((it, idx) =>
    SaleItem.create({
      id: `it-${idx}`,
      saleId: "sale-1",
      productId: it.productId,
      productPriceId: it.productPriceId,
      dosificationId: it.dosificationId,
      numPartsSnapshot: it.numPartsSnapshot,
      productCodeSnapshot: it.productCodeSnapshot,
      productNameSnapshot: it.productNameSnapshot,
      priceNameSnapshot: it.priceNameSnapshot,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountPct: it.discountPct,
      ivaRate: it.ivaRate,
      iepsRate: it.iepsRate,
      lineSubtotal: it.lineSubtotal,
      lineTax: it.lineTax,
      lineTotal: it.lineTotal,
    })
  );
  const sale = Sale.create({
    id: "sale-1",
    folioId: data.folioId,
    folioNumber: 1,
    folioCode: "F-1",
    branchId: data.branchId,
    customerId: data.customerId,
    cashierId: data.cashierId,
    paymentMethodId: data.paymentMethodId,
    quoteId: data.quoteId ?? null,
    status: "completed",
    paidAmount: data.paidAmount,
    paymentStatus: data.paymentStatus,
    subtotal: data.subtotal,
    taxTotal: data.taxTotal,
    total: data.total,
    notes: data.notes,
    completedAt: now,
    cancelledAt: null,
    cancellationReason: null,
    editedAt: null,
    createdAt: now,
    updatedAt: now,
    items,
  });
  return {
    sale,
    joined: {
      branchName: "Matriz",
      customerName: "Cliente",
      customerRfc: "ACM010101AAA",
      cashierName: "Cajero",
      paymentMethodCode: "EFECTIVO",
      paymentMethodName: "Efectivo",
      paymentMethodIsCredit: false,
    },
  };
}

function makeRepo(): SaleRepository {
  return {
    findAll: jest.fn(),
    findByIdWithItems: jest.fn(),
    createCompleted: jest.fn((data) => Promise.resolve(makeSummary(data))),
    createCompletedFromQuote: jest.fn((data) => Promise.resolve(makeSummary(data))),
    cancel: jest.fn(),
    replaceItemsAndRecalculate: jest.fn(),
    markReturnedTotal: jest.fn(),
  };
}

function makeLookups(overrides?: Partial<PosLookupService>): PosLookupService {
  return {
    getProduct: jest.fn().mockResolvedValue({
      id: "p1",
      code: "P1",
      name: "Producto 1",
      ivaRate: 0.16,
      iepsRate: null,
      isActive: true,
    }),
    getProductPrice: jest.fn().mockResolvedValue({
      id: "pp1",
      productId: "p1",
      name: "Menudeo",
      price: 100,
      discountPct: null,
    }),
    getCustomer: jest.fn().mockResolvedValue({ id: "c1", isActive: true, creditLimit: null, currentBalance: 0 }),
    getBranch: jest.fn().mockResolvedValue({ id: "b1", isActive: true }),
    getFolio: jest.fn().mockResolvedValue({ id: "f1", code: "VENTA", prefix: null, scope: "POS", isActive: true }),
    getPaymentMethod: jest.fn().mockResolvedValue({ id: "pm1", isActive: true, isCredit: false }),
    getDosificationForSale: jest.fn().mockResolvedValue({
      id: "d1",
      productId: "p1",
      name: "1/4",
      numParts: 4,
      isActive: true,
      basePrice: 100,
    }),
    ...overrides,
  };
}

const baseReq = {
  branchId: "b1",
  customerId: "c1",
  paymentMethodId: "pm1",
  folioId: "f1",
  items: [{ productId: "p1", productPriceId: "pp1", quantity: 2 }],
};

describe("CreateSaleUseCase", () => {
  it("emite venta y calcula totales con IVA 16%", async () => {
    const repo = makeRepo();
    const result = await new CreateSaleUseCase(repo, makeLookups()).execute(baseReq, "user-1");
    expect(result.dto.status).toBe("completed");
    expect(result.dto.subtotal).toBe(200);
    expect(result.dto.taxTotal).toBe(32);
    expect(result.dto.total).toBe(232);
    expect(repo.createCompleted).toHaveBeenCalledTimes(1);
  });

  it("rechaza items vacíos con EmptySaleError", async () => {
    await expect(
      new CreateSaleUseCase(makeRepo(), makeLookups()).execute({ ...baseReq, items: [] }, "user-1")
    ).rejects.toThrow(EmptySaleError);
  });

  it("rechaza customer inactivo", async () => {
    const lookups = makeLookups({
      getCustomer: jest.fn().mockResolvedValue({ id: "c1", isActive: false, creditLimit: null, currentBalance: 0 }),
    });
    await expect(
      new CreateSaleUseCase(makeRepo(), lookups).execute(baseReq, "user-1")
    ).rejects.toThrow(InactiveResourceError);
  });

  it("rechaza productPrice cuyo productId difiere del item", async () => {
    const lookups = makeLookups({
      getProductPrice: jest.fn().mockResolvedValue({
        id: "pp1",
        productId: "pX",
        name: "Otro",
        price: 100,
        discountPct: null,
      }),
    });
    await expect(
      new CreateSaleUseCase(makeRepo(), lookups).execute(baseReq, "user-1")
    ).rejects.toThrow(ProductPriceMismatchError);
  });

  it("rechaza producto inactivo", async () => {
    const lookups = makeLookups({
      getProduct: jest.fn().mockResolvedValue({
        id: "p1",
        code: "P1",
        name: "X",
        ivaRate: null,
        iepsRate: null,
        isActive: false,
      }),
    });
    await expect(
      new CreateSaleUseCase(makeRepo(), lookups).execute(baseReq, "user-1")
    ).rejects.toThrow(InactiveResourceError);
  });

  it("rechaza folio con scope OPERATIONS (espera POS)", async () => {
    const lookups = makeLookups({
      getFolio: jest.fn().mockResolvedValue({ id: "f1", code: "RB", prefix: "RB-", scope: "OPERATIONS", isActive: true }),
    });
    const repo = makeRepo();
    const err = await new CreateSaleUseCase(repo, lookups).execute(baseReq, "user-1").catch((e) => e);
    expect(err).toBeInstanceOf(FolioScopeMismatchError);
    expect(err.expected).toBe("POS");
    expect(err.actual).toBe("OPERATIONS");
    expect(repo.createCompleted).not.toHaveBeenCalled();
  });

  it("rechaza folio con scope INVENTORY (espera POS)", async () => {
    const lookups = makeLookups({
      getFolio: jest.fn().mockResolvedValue({ id: "f1", code: "TS", prefix: "TS-", scope: "INVENTORY", isActive: true }),
    });
    const err = await new CreateSaleUseCase(makeRepo(), lookups).execute(baseReq, "user-1").catch((e) => e);
    expect(err).toBeInstanceOf(FolioScopeMismatchError);
    expect(err.expected).toBe("POS");
    expect(err.actual).toBe("INVENTORY");
  });

  describe("ventas por dosificación", () => {
    const dosReq = {
      ...baseReq,
      items: [{ productId: "p1", dosificationId: "d1", quantity: 3 }],
    };

    it("calcula unitPrice = (basePrice/numParts)*1.07 y snapshotea numParts/dosificationId", async () => {
      const repo = makeRepo();
      const result = await new CreateSaleUseCase(repo, makeLookups()).execute(dosReq, "user-1");
      expect(result.dto.status).toBe("completed");
      const call = (repo.createCompleted as jest.Mock).mock.calls[0][0] as CreateSaleData;
      expect(call.items[0].unitPrice).toBeCloseTo(26.75, 4); // (100/4)*1.07
      expect(call.items[0].productPriceId).toBeNull();
      expect(call.items[0].dosificationId).toBe("d1");
      expect(call.items[0].numPartsSnapshot).toBe(4);
      expect(call.items[0].priceNameSnapshot).toBe("1/4");
      expect(call.items[0].discountPct).toBeNull();
    });

    it("permite vender más partes que numParts (sin tope)", async () => {
      const repo = makeRepo();
      await new CreateSaleUseCase(repo, makeLookups()).execute(
        { ...baseReq, items: [{ productId: "p1", dosificationId: "d1", quantity: 6 }] },
        "user-1"
      );
      expect(repo.createCompleted).toHaveBeenCalledTimes(1);
    });

    it("rechaza dosificación sin precio default con DosificationRequiresDefaultPriceError", async () => {
      const lookups = makeLookups({
        getDosificationForSale: jest.fn().mockResolvedValue({
          id: "d1", productId: "p1", name: "1/4", numParts: 4, isActive: true, basePrice: null,
        }),
      });
      await expect(new CreateSaleUseCase(makeRepo(), lookups).execute(dosReq, "user-1")).rejects.toThrow(
        DosificationRequiresDefaultPriceError
      );
    });

    it("rechaza dosificación inactiva", async () => {
      const lookups = makeLookups({
        getDosificationForSale: jest.fn().mockResolvedValue({
          id: "d1", productId: "p1", name: "1/4", numParts: 4, isActive: false, basePrice: 100,
        }),
      });
      await expect(new CreateSaleUseCase(makeRepo(), lookups).execute(dosReq, "user-1")).rejects.toThrow(
        InactiveResourceError
      );
    });

    it("rechaza dosificación que no pertenece al producto con DosificationMismatchError", async () => {
      const lookups = makeLookups({
        getDosificationForSale: jest.fn().mockResolvedValue({
          id: "d1", productId: "pX", name: "1/4", numParts: 4, isActive: true, basePrice: 100,
        }),
      });
      await expect(new CreateSaleUseCase(makeRepo(), lookups).execute(dosReq, "user-1")).rejects.toThrow(
        DosificationMismatchError
      );
    });

    it("rechaza línea con ambos productPriceId y dosificationId", async () => {
      await expect(
        new CreateSaleUseCase(makeRepo(), makeLookups()).execute(
          { ...baseReq, items: [{ productId: "p1", productPriceId: "pp1", dosificationId: "d1", quantity: 1 }] },
          "user-1"
        )
      ).rejects.toThrow("Exactly one of productPriceId or dosificationId is required");
    });

    it("rechaza línea sin productPriceId ni dosificationId", async () => {
      await expect(
        new CreateSaleUseCase(makeRepo(), makeLookups()).execute(
          { ...baseReq, items: [{ productId: "p1", quantity: 1 }] },
          "user-1"
        )
      ).rejects.toThrow("Exactly one of productPriceId or dosificationId is required");
    });
  });

  describe("ventas a crédito", () => {
    const creditLookups = (creditLimit: number | null = 5000, currentBalance = 0) =>
      makeLookups({
        getPaymentMethod: jest.fn().mockResolvedValue({ id: "pm1", isActive: true, isCredit: true }),
        getCustomer: jest.fn().mockResolvedValue({ id: "c1", isActive: true, creditLimit, currentBalance }),
      });

    it("crea venta a crédito con paidAmount=0 y paymentStatus=pending", async () => {
      const repo = makeRepo();
      const result = await new CreateSaleUseCase(repo, creditLookups()).execute(baseReq, "user-1");
      expect(result.dto.paymentStatus).toBe("pending");
      const call = (repo.createCompleted as jest.Mock).mock.calls[0][0] as CreateSaleData;
      expect(call.paidAmount).toBe(0);
      expect(call.paymentStatus).toBe("pending");
    });

    it("lanza CustomerHasNoCreditLineError cuando creditLimit es null", async () => {
      const lookups = creditLookups(null);
      await expect(
        new CreateSaleUseCase(makeRepo(), lookups).execute(baseReq, "user-1")
      ).rejects.toThrow(CustomerHasNoCreditLineError);
    });

    it("lanza CreditLimitExceededError cuando el total supera el crédito disponible", async () => {
      // Product price=100, qty=2, total=232. Available = 5000 - 4900 = 100 < 232
      const lookups = creditLookups(5000, 4900);
      const err = await new CreateSaleUseCase(makeRepo(), lookups)
        .execute(baseReq, "user-1")
        .catch((e) => e);
      expect(err).toBeInstanceOf(CreditLimitExceededError);
      expect(err.available).toBe("100.0000");
    });

    it("crea venta a crédito cuando el total cabe exactamente en el crédito disponible", async () => {
      // total = 232 (qty=2 * price=100 * 1.16 IVA). creditLimit=5000, balance=4768 → available=232
      const lookups = creditLookups(5000, 4768);
      const repo = makeRepo();
      const result = await new CreateSaleUseCase(repo, lookups).execute(baseReq, "user-1");
      expect(result.dto.paymentStatus).toBe("pending");
    });
  });
});
