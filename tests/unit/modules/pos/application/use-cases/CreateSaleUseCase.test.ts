import { CreateSaleUseCase } from "@/modules/pos/application/use-cases/CreateSaleUseCase";
import { SaleRepository, SaleSummary, CreateSaleData } from "@/modules/pos/application/ports/SaleRepository";
import { PosLookupService } from "@/modules/pos/application/ports/PosLookups";
import { Sale } from "@/modules/pos/domain/entities/Sale";
import { SaleItem } from "@/modules/pos/domain/entities/SaleItem";
import { EmptySaleError } from "@/modules/pos/domain/errors/EmptySaleError";
import { ProductPriceMismatchError } from "@/modules/pos/domain/errors/ProductPriceMismatchError";
import { InactiveResourceError } from "@/modules/pos/domain/errors/InactiveResourceError";
import { CustomerHasNoCreditLineError } from "@/modules/payments/domain/errors/CustomerHasNoCreditLineError";
import { CreditLimitExceededError } from "@/modules/payments/domain/errors/CreditLimitExceededError";

function makeSummary(data: CreateSaleData): SaleSummary {
  const now = new Date();
  const items = data.items.map((it, idx) =>
    SaleItem.create({
      id: `it-${idx}`,
      saleId: "sale-1",
      productId: it.productId,
      productPriceId: it.productPriceId,
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
    getFolio: jest.fn().mockResolvedValue({ id: "f1", code: "VENTA", prefix: null, isActive: true }),
    getPaymentMethod: jest.fn().mockResolvedValue({ id: "pm1", isActive: true, isCredit: false }),
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
