import { CancelSaleUseCase } from "@/modules/pos/application/use-cases/CancelSaleUseCase";
import { SaleRepository, SaleSummary } from "@/modules/pos/application/ports/SaleRepository";
import { Sale, SaleStatus } from "@/modules/pos/domain/entities/Sale";
import { SaleNotFoundError } from "@/modules/pos/domain/errors/SaleNotFoundError";
import { SaleHasActivePaymentsError } from "@/modules/payments/domain/errors/SaleHasActivePaymentsError";

function makeSummary(status: SaleStatus, opts?: { reason?: string | null; cancelledAt?: Date }): SaleSummary {
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
    paidAmount: 116,
    paymentStatus: "paid",
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    notes: null,
    completedAt: now,
    cancelledAt: status === "cancelled" ? opts?.cancelledAt ?? now : null,
    cancellationReason: status === "cancelled" ? opts?.reason ?? null : null,
    editedAt: null,
    createdAt: now,
    updatedAt: now,
    items: [],
  });
  return {
    sale,
    joined: { branchName: null, customerName: null, customerRfc: null, cashierName: null, paymentMethodCode: null, paymentMethodIsCredit: false },
  };
}

describe("CancelSaleUseCase", () => {
  it("cancela una venta completed y delega la restauración de stock al repo", async () => {
    const cancel = jest.fn().mockResolvedValue(makeSummary("cancelled", { reason: "test" }));
    const repo: SaleRepository = {
      findAll: jest.fn(),
      findByIdWithItems: jest.fn().mockResolvedValue(makeSummary("completed")),
      createCompleted: jest.fn(),
      createCompletedFromQuote: jest.fn(),
      cancel,
      replaceItemsAndRecalculate: jest.fn(),
    };
    const result = await new CancelSaleUseCase(repo).execute("sale-1", { reason: "test" });
    expect(result.dto.status).toBe("cancelled");
    expect(cancel).toHaveBeenCalledWith("sale-1", "test");
  });

  it("propaga branchId del repo (para que el controller aplique scoping)", async () => {
    const repo: SaleRepository = {
      findAll: jest.fn(),
      findByIdWithItems: jest.fn().mockResolvedValue(makeSummary("completed")),
      createCompleted: jest.fn(),
      createCompletedFromQuote: jest.fn(),
      cancel: jest.fn().mockResolvedValue(makeSummary("cancelled")),
      replaceItemsAndRecalculate: jest.fn(),
    };
    const result = await new CancelSaleUseCase(repo).execute("sale-1", {});
    expect(result.branchId).toBe("b1");
  });

  it("lanza SaleNotFoundError cuando el repo no devuelve la venta", async () => {
    const repo: SaleRepository = {
      findAll: jest.fn(),
      findByIdWithItems: jest.fn().mockResolvedValue(null),
      createCompleted: jest.fn(),
      createCompletedFromQuote: jest.fn(),
      cancel: jest.fn(),
      replaceItemsAndRecalculate: jest.fn(),
    };
    await expect(new CancelSaleUseCase(repo).execute("missing", {})).rejects.toThrow(
      SaleNotFoundError
    );
  });

  it("es idempotente para venta ya cancelada (el repo decide; el use case sólo llama una vez)", async () => {
    const cancel = jest.fn().mockResolvedValue(makeSummary("cancelled", { reason: "primera vez" }));
    const repo: SaleRepository = {
      findAll: jest.fn(),
      findByIdWithItems: jest.fn().mockResolvedValue(makeSummary("cancelled", { reason: "primera vez" })),
      createCompleted: jest.fn(),
      createCompletedFromQuote: jest.fn(),
      cancel,
      replaceItemsAndRecalculate: jest.fn(),
    };
    const result = await new CancelSaleUseCase(repo).execute("sale-1", { reason: "segunda vez" });
    expect(result.dto.status).toBe("cancelled");
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("acepta reason: null (cancel sin motivo)", async () => {
    const cancel = jest.fn().mockResolvedValue(makeSummary("cancelled"));
    const repo: SaleRepository = {
      findAll: jest.fn(),
      findByIdWithItems: jest.fn().mockResolvedValue(makeSummary("completed")),
      createCompleted: jest.fn(),
      createCompletedFromQuote: jest.fn(),
      cancel,
      replaceItemsAndRecalculate: jest.fn(),
    };
    await new CancelSaleUseCase(repo).execute("sale-1", {});
    expect(cancel).toHaveBeenCalledWith("sale-1", null);
  });

  it("propaga SaleHasActivePaymentsError cuando el repo la lanza", async () => {
    const repo: SaleRepository = {
      findAll: jest.fn(),
      findByIdWithItems: jest.fn().mockResolvedValue(makeSummary("completed")),
      createCompleted: jest.fn(),
      createCompletedFromQuote: jest.fn(),
      cancel: jest.fn().mockRejectedValue(new SaleHasActivePaymentsError(["p-1", "p-2"])),
      replaceItemsAndRecalculate: jest.fn(),
    };
    await expect(new CancelSaleUseCase(repo).execute("sale-1", {})).rejects.toBeInstanceOf(SaleHasActivePaymentsError);
  });
});
