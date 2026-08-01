import { InMemoryPaymentRepository } from "@/modules/payments/infrastructure/repositories/InMemoryPaymentRepository";
import { RegisterPaymentUseCase } from "@/modules/payments/application/use-cases/RegisterPaymentUseCase";
import { PaymentExceedsLineDueAmountError } from "@/modules/payments/domain/errors/PaymentExceedsLineDueAmountError";
import { PaymentItemsAmountMismatchError } from "@/modules/payments/domain/errors/PaymentItemsAmountMismatchError";
import { SaleItemNotFoundError } from "@/modules/payments/domain/errors/SaleItemNotFoundError";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const BRANCH_ID = "branch-1";
const SALE_ID = "sale-1";
const CUSTOMER_ID = "customer-1";
const PM_ID = "pm-recibo";
const FOLIO_ID = "folio-recibo";
const LINE_A = "line-a";
const LINE_B = "line-b";

function makeRepo() {
  const repo = new InMemoryPaymentRepository();
  repo.seedSale({
    id: SALE_ID,
    folioCode: "VNT-000001",
    folioNumber: 1,
    branchId: BRANCH_ID,
    customerId: CUSTOMER_ID,
    total: 150,
    paidAmount: 0,
    paymentStatus: "pending",
    isCredit: true,
    status: "completed",
  });
  repo.seedCustomer({ id: CUSTOMER_ID, currentBalance: 150, creditLimit: 5000 });
  repo.seedSaleItem({ id: LINE_A, saleId: SALE_ID, lineTotal: 100, productNameSnapshot: "Producto A" });
  repo.seedSaleItem({ id: LINE_B, saleId: SALE_ID, lineTotal: 50, productNameSnapshot: "Producto B" });
  return repo;
}

function makeUseCase(repo: InMemoryPaymentRepository) {
  return new RegisterPaymentUseCase(repo);
}

describe("RegisterPaymentUseCase — abono por línea", () => {
  it("retrocompatible: sin items, comportamiento idéntico al actual", async () => {
    const repo = makeRepo();
    const useCase = makeUseCase(repo);

    const result = await useCase.execute({
      saleId: SALE_ID,
      paymentMethodId: PM_ID,
      folioId: FOLIO_ID,
      amount: 60,
      userId: USER_ID,
      callerBranchId: null,
    });

    expect(result.dto.status).toBe("completed");
    expect(result.dto.items).toBeUndefined();
  });

  it("reparte un abono entre dos líneas con montos independientes", async () => {
    const repo = makeRepo();
    const useCase = makeUseCase(repo);

    const result = await useCase.execute({
      saleId: SALE_ID,
      paymentMethodId: PM_ID,
      folioId: FOLIO_ID,
      amount: 110,
      userId: USER_ID,
      callerBranchId: null,
      items: [
        { saleItemId: LINE_A, amount: 60 },
        { saleItemId: LINE_B, amount: 50 },
      ],
    });

    expect(result.dto.sale.paidAmount).toBe("110.0000");
    expect(result.dto.items).toHaveLength(2);

    const { result: bySale } = await new (
      await import("@/modules/payments/application/use-cases/ListPaymentsBySaleUseCase")
    ).ListPaymentsBySaleUseCase(repo).execute(SALE_ID);
    const lineA = bySale.lineBalances.find((lb) => lb.saleItemId === LINE_A)!;
    const lineB = bySale.lineBalances.find((lb) => lb.saleItemId === LINE_B)!;
    expect(lineA.dueAmount).toBe("40.0000");
    expect(lineB.dueAmount).toBe("0.0000");
  });

  it("rechaza cuando el monto de una línea excede su propio saldo", async () => {
    const repo = makeRepo();
    const useCase = makeUseCase(repo);

    await expect(
      useCase.execute({
        saleId: SALE_ID,
        paymentMethodId: PM_ID,
        folioId: FOLIO_ID,
        amount: 70,
        userId: USER_ID,
        callerBranchId: null,
        items: [{ saleItemId: LINE_A, amount: 70 }],
      })
    ).resolves.toBeDefined();

    await expect(
      useCase.execute({
        saleId: SALE_ID,
        paymentMethodId: PM_ID,
        folioId: FOLIO_ID,
        amount: 70,
        userId: USER_ID,
        callerBranchId: null,
        items: [{ saleItemId: LINE_A, amount: 70 }],
      })
    ).rejects.toThrow(PaymentExceedsLineDueAmountError);
  });

  it("rechaza cuando la suma de items no coincide con amount", async () => {
    const repo = makeRepo();
    const useCase = makeUseCase(repo);

    await expect(
      useCase.execute({
        saleId: SALE_ID,
        paymentMethodId: PM_ID,
        folioId: FOLIO_ID,
        amount: 100,
        userId: USER_ID,
        callerBranchId: null,
        items: [{ saleItemId: LINE_A, amount: 40 }, { saleItemId: LINE_B, amount: 50 }],
      })
    ).rejects.toThrow(PaymentItemsAmountMismatchError);
  });

  it("rechaza un saleItemId ajeno a la venta", async () => {
    const repo = makeRepo();
    const useCase = makeUseCase(repo);

    await expect(
      useCase.execute({
        saleId: SALE_ID,
        paymentMethodId: PM_ID,
        folioId: FOLIO_ID,
        amount: 10,
        userId: USER_ID,
        callerBranchId: null,
        items: [{ saleItemId: "other-line", amount: 10 }],
      })
    ).rejects.toThrow(SaleItemNotFoundError);
  });

  it("cancelar un abono con desglose revierte el saldo por línea", async () => {
    const repo = makeRepo();
    const useCase = makeUseCase(repo);

    const result = await useCase.execute({
      saleId: SALE_ID,
      paymentMethodId: PM_ID,
      folioId: FOLIO_ID,
      amount: 60,
      userId: USER_ID,
      callerBranchId: null,
      items: [{ saleItemId: LINE_A, amount: 60 }],
    });

    await repo.markCancelled(result.dto.id, "prueba", USER_ID);

    const { result: bySale } = await new (
      await import("@/modules/payments/application/use-cases/ListPaymentsBySaleUseCase")
    ).ListPaymentsBySaleUseCase(repo).execute(SALE_ID);
    const lineA = bySale.lineBalances.find((lb) => lb.saleItemId === LINE_A)!;
    expect(lineA.dueAmount).toBe("100.0000");
  });
});
