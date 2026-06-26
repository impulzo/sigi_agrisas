import { EditCompletedSaleUseCase } from "@/modules/pos/application/use-cases/EditCompletedSaleUseCase";
import { SaleRepository, SaleSummary, EditSaleData } from "@/modules/pos/application/ports/SaleRepository";
import { PosLookupService } from "@/modules/pos/application/ports/PosLookups";
import { Sale, SaleStatus } from "@/modules/pos/domain/entities/Sale";
import { SaleNotFoundError } from "@/modules/pos/domain/errors/SaleNotFoundError";
import { CancelledSaleNotEditableError } from "@/modules/pos/domain/errors/CancelledSaleNotEditableError";
import { EmptySaleError } from "@/modules/pos/domain/errors/EmptySaleError";
import { ProductPriceMismatchError } from "@/modules/pos/domain/errors/ProductPriceMismatchError";
import { SaleHasActivePaymentsError } from "@/modules/payments/domain/errors/SaleHasActivePaymentsError";
import { ReturnedTotalSaleNotEditableError } from "@/modules/pos/domain/errors/ReturnedTotalSaleNotEditableError";

function makeSummary(status: SaleStatus): SaleSummary {
  const now = new Date();
  const sale = Sale.create({
    id: "sale-1",
    folioId: "f1",
    folioNumber: 1,
    folioCode: "F-1",
    branchId: "b1",
    customerId: "c1",
    cashierId: "u1",
    paymentMethodId: "pm1",
    quoteId: null,
    status,
    paidAmount: 0,
    paymentStatus: "paid",
    subtotal: 0,
    taxTotal: 0,
    total: 0,
    notes: null,
    completedAt: now,
    cancelledAt: status === "cancelled" ? now : null,
    cancellationReason: null,
    editedAt: status === "edited" ? now : null,
    createdAt: now,
    updatedAt: now,
    items: [],
  });
  return {
    sale,
    joined: { branchName: null, customerName: null, customerRfc: null, cashierName: null, paymentMethodCode: null, paymentMethodIsCredit: false },
  };
}

function makeLookups(overrides?: Partial<PosLookupService>): PosLookupService {
  return {
    getProduct: jest.fn().mockResolvedValue({
      id: "p1",
      code: "P1",
      name: "Producto",
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
    ...overrides,
  };
}

function makeRepo(initialStatus: SaleStatus): SaleRepository {
  return {
    findAll: jest.fn(),
    findByIdWithItems: jest.fn().mockResolvedValue(makeSummary(initialStatus)),
    createCompleted: jest.fn(),
    createCompletedFromQuote: jest.fn(),
    cancel: jest.fn(),
    replaceItemsAndRecalculate: jest.fn((id: string, data: EditSaleData) =>
      Promise.resolve({
        ...makeSummary("edited"),
        sale: { ...makeSummary("edited").sale, subtotal: data.subtotal, taxTotal: data.taxTotal, total: data.total } as Sale,
      })
    ),
    markReturnedTotal: jest.fn(),
  };
}

const baseReq = { items: [{ productId: "p1", productPriceId: "pp1", quantity: 1 }] };

describe("EditCompletedSaleUseCase", () => {
  it("recalcula totales y delega al repo", async () => {
    const repo = makeRepo("completed");
    const result = await new EditCompletedSaleUseCase(repo, makeLookups()).execute("sale-1", baseReq);
    expect(result.dto.status).toBe("edited");
    expect(result.dto.subtotal).toBe(100);
    expect(result.dto.taxTotal).toBe(16);
    expect(result.dto.total).toBe(116);
  });

  it("rechaza venta cancelada con CancelledSaleNotEditableError", async () => {
    await expect(
      new EditCompletedSaleUseCase(makeRepo("cancelled"), makeLookups()).execute("sale-1", baseReq)
    ).rejects.toThrow(CancelledSaleNotEditableError);
  });

  it("permite editar una venta previamente editada", async () => {
    const repo = makeRepo("edited");
    const result = await new EditCompletedSaleUseCase(repo, makeLookups()).execute("sale-1", baseReq);
    expect(result.dto.status).toBe("edited");
  });

  it("lanza SaleNotFoundError cuando la venta no existe", async () => {
    const repo: SaleRepository = {
      findAll: jest.fn(),
      findByIdWithItems: jest.fn().mockResolvedValue(null),
      createCompleted: jest.fn(),
      createCompletedFromQuote: jest.fn(),
      cancel: jest.fn(),
      replaceItemsAndRecalculate: jest.fn(),
      markReturnedTotal: jest.fn(),
    };
    await expect(
      new EditCompletedSaleUseCase(repo, makeLookups()).execute("missing", baseReq)
    ).rejects.toThrow(SaleNotFoundError);
  });

  it("rechaza items vacíos con EmptySaleError", async () => {
    await expect(
      new EditCompletedSaleUseCase(makeRepo("completed"), makeLookups()).execute("sale-1", { items: [] })
    ).rejects.toThrow(EmptySaleError);
  });

  it("rechaza productPrice cuyo productId no coincide con el item", async () => {
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
      new EditCompletedSaleUseCase(makeRepo("completed"), lookups).execute("sale-1", baseReq)
    ).rejects.toThrow(ProductPriceMismatchError);
  });

  it("ignora cambios de folioId/branchId (no se aceptan en el DTO)", async () => {
    const repo = makeRepo("completed");
    const result = await new EditCompletedSaleUseCase(repo, makeLookups()).execute("sale-1", baseReq);
    // El DTO de edición no incluye folioId/branchId; el use case nunca los pasa al repo
    const callArg = (repo.replaceItemsAndRecalculate as jest.Mock).mock.calls[0][1] as EditSaleData;
    expect("folioId" in callArg).toBe(false);
    expect("branchId" in callArg).toBe(false);
  });

  it("propaga SaleHasActivePaymentsError cuando el repo la lanza al editar", async () => {
    const repo: SaleRepository = {
      findAll: jest.fn(),
      findByIdWithItems: jest.fn().mockResolvedValue(makeSummary("completed")),
      createCompleted: jest.fn(),
      createCompletedFromQuote: jest.fn(),
      cancel: jest.fn(),
      replaceItemsAndRecalculate: jest.fn().mockRejectedValue(new SaleHasActivePaymentsError(["pay-1"])),
      markReturnedTotal: jest.fn(),
    };
    await expect(
      new EditCompletedSaleUseCase(repo, makeLookups()).execute("sale-1", baseReq)
    ).rejects.toBeInstanceOf(SaleHasActivePaymentsError);
  });

  it("lanza ReturnedTotalSaleNotEditableError cuando sale tiene status returned_total", async () => {
    await expect(
      new EditCompletedSaleUseCase(makeRepo("returned_total"), makeLookups()).execute("sale-1", baseReq)
    ).rejects.toBeInstanceOf(ReturnedTotalSaleNotEditableError);
  });
});
