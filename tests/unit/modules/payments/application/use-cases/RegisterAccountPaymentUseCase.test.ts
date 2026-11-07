import { InMemoryPaymentRepository } from "@/modules/payments/infrastructure/repositories/InMemoryPaymentRepository";
import { RegisterAccountPaymentUseCase } from "@/modules/payments/application/use-cases/RegisterAccountPaymentUseCase";
import { GetCustomerAccountDebtUseCase } from "@/modules/payments/application/use-cases/GetCustomerAccountDebtUseCase";
import { CancelPaymentUseCase } from "@/modules/payments/application/use-cases/CancelPaymentUseCase";
import { PaymentExceedsAccountDebtError } from "@/modules/payments/domain/errors/PaymentExceedsAccountDebtError";
import { CustomerNotFoundError } from "@/modules/customers/domain/errors/CustomerNotFoundError";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const BRANCH_ID = "branch-1";
const SALE_ID = "sale-1";
const CUSTOMER_ID = "customer-1";
const PM_ID = "pm-recibo";
const FOLIO_ID = "folio-recibo";

/**
 * Cliente con currentBalance=500: $300 de una venta a crédito pendiente
 * (con ticket) + $200 sin ticket (ej. initialBalance). accountDebt=200.
 */
function makeRepoWithMixedDebt() {
  const repo = new InMemoryPaymentRepository();
  repo.seedSale({
    id: SALE_ID,
    folioCode: "VNT-000001",
    folioNumber: 1,
    branchId: BRANCH_ID,
    customerId: CUSTOMER_ID,
    total: 300,
    paidAmount: 0,
    paymentStatus: "pending",
    isCredit: true,
    status: "completed",
    createdAt: new Date("2026-01-01"),
  });
  repo.seedCustomer({ id: CUSTOMER_ID, currentBalance: 500, creditLimit: 5000 });
  return repo;
}

describe("RegisterAccountPaymentUseCase", () => {
  it("registers an account payment within accountDebt and decrements currentBalance without touching the pending sale", async () => {
    const repo = makeRepoWithMixedDebt();
    const useCase = new RegisterAccountPaymentUseCase(repo);

    const result = await useCase.execute({
      customerId: CUSTOMER_ID,
      paymentMethodId: PM_ID,
      folioId: FOLIO_ID,
      amount: 200,
      notes: null,
      userId: USER_ID,
      branchId: BRANCH_ID,
    });

    expect(result.dto.saleId).toBeNull();
    expect(result.dto.sale).toBeNull();
    expect(result.dto.amount).toBe("200.0000");

    const debt = await new GetCustomerAccountDebtUseCase(repo).execute({
      customerId: CUSTOMER_ID,
      branchId: BRANCH_ID,
    });
    expect(debt.currentBalance).toBe("300.0000");
    expect(debt.accountDebt).toBe("0.0000");
    expect(debt.pendingSales).toHaveLength(1);
    expect(debt.pendingSales[0].due).toBe("300.0000");
  });

  it("rejects an amount exceeding accountDebt without persisting anything", async () => {
    const repo = makeRepoWithMixedDebt();
    const useCase = new RegisterAccountPaymentUseCase(repo);

    await expect(
      useCase.execute({
        customerId: CUSTOMER_ID,
        paymentMethodId: PM_ID,
        folioId: FOLIO_ID,
        amount: 250,
        notes: null,
        userId: USER_ID,
        branchId: BRANCH_ID,
      })
    ).rejects.toThrow(PaymentExceedsAccountDebtError);

    const debt = await new GetCustomerAccountDebtUseCase(repo).execute({
      customerId: CUSTOMER_ID,
      branchId: BRANCH_ID,
    });
    expect(debt.currentBalance).toBe("500.0000");
  });

  it("rejects when the entire balance is ticketed debt (accountDebt=0)", async () => {
    const repo = new InMemoryPaymentRepository();
    repo.seedSale({
      id: SALE_ID,
      folioCode: "VNT-000001",
      folioNumber: 1,
      branchId: BRANCH_ID,
      customerId: CUSTOMER_ID,
      total: 300,
      paidAmount: 0,
      paymentStatus: "pending",
      isCredit: true,
      status: "completed",
    });
    repo.seedCustomer({ id: CUSTOMER_ID, currentBalance: 300, creditLimit: 5000 });
    const useCase = new RegisterAccountPaymentUseCase(repo);

    await expect(
      useCase.execute({
        customerId: CUSTOMER_ID,
        paymentMethodId: PM_ID,
        folioId: FOLIO_ID,
        amount: 1,
        notes: null,
        userId: USER_ID,
        branchId: BRANCH_ID,
      })
    ).rejects.toThrow(PaymentExceedsAccountDebtError);
  });

  it("throws CustomerNotFoundError for an unknown customer", async () => {
    const repo = new InMemoryPaymentRepository();
    const useCase = new RegisterAccountPaymentUseCase(repo);

    await expect(
      useCase.execute({
        customerId: "ghost-customer",
        paymentMethodId: PM_ID,
        folioId: FOLIO_ID,
        amount: 100,
        notes: null,
        userId: USER_ID,
        branchId: BRANCH_ID,
      })
    ).rejects.toThrow(CustomerNotFoundError);
  });

  it("cancelling an account payment restores currentBalance without touching any sale", async () => {
    const repo = makeRepoWithMixedDebt();
    const registerUseCase = new RegisterAccountPaymentUseCase(repo);
    const cancelUseCase = new CancelPaymentUseCase(repo);

    const { dto } = await registerUseCase.execute({
      customerId: CUSTOMER_ID,
      paymentMethodId: PM_ID,
      folioId: FOLIO_ID,
      amount: 200,
      notes: null,
      userId: USER_ID,
      branchId: BRANCH_ID,
    });

    const cancelled = await cancelUseCase.execute(dto.id, null, USER_ID);
    expect(cancelled.dto.status).toBe("cancelled");
    expect(cancelled.dto.sale).toBeNull();

    const debt = await new GetCustomerAccountDebtUseCase(repo).execute({
      customerId: CUSTOMER_ID,
      branchId: BRANCH_ID,
    });
    expect(debt.currentBalance).toBe("500.0000");
    // The pending sale's own balance is untouched by the account-payment cancellation.
    expect(debt.pendingSales[0].due).toBe("300.0000");
  });

  it("cancelling an already-cancelled account payment is rejected", async () => {
    const repo = makeRepoWithMixedDebt();
    const registerUseCase = new RegisterAccountPaymentUseCase(repo);
    const cancelUseCase = new CancelPaymentUseCase(repo);

    const { dto } = await registerUseCase.execute({
      customerId: CUSTOMER_ID,
      paymentMethodId: PM_ID,
      folioId: FOLIO_ID,
      amount: 200,
      notes: null,
      userId: USER_ID,
      branchId: BRANCH_ID,
    });

    await cancelUseCase.execute(dto.id, null, USER_ID);
    await expect(cancelUseCase.execute(dto.id, null, USER_ID)).rejects.toThrow();
  });
});

describe("GetCustomerAccountDebtUseCase", () => {
  it("returns pendingSales ordered oldest-first and accountDebt floored at 0", async () => {
    const repo = new InMemoryPaymentRepository();
    repo.seedSale({
      id: "sale-old",
      folioCode: "VNT-OLD",
      folioNumber: 1,
      branchId: BRANCH_ID,
      customerId: CUSTOMER_ID,
      total: 100,
      paidAmount: 0,
      paymentStatus: "pending",
      isCredit: true,
      status: "completed",
      createdAt: new Date("2026-01-01"),
    });
    repo.seedSale({
      id: "sale-new",
      folioCode: "VNT-NEW",
      folioNumber: 2,
      branchId: BRANCH_ID,
      customerId: CUSTOMER_ID,
      total: 50,
      paidAmount: 0,
      paymentStatus: "pending",
      isCredit: true,
      status: "completed",
      createdAt: new Date("2026-02-01"),
    });
    repo.seedCustomer({ id: CUSTOMER_ID, currentBalance: 150, creditLimit: 5000 });

    const result = await new GetCustomerAccountDebtUseCase(repo).execute({
      customerId: CUSTOMER_ID,
      branchId: BRANCH_ID,
    });

    expect(result.pendingSales.map((s) => s.saleId)).toEqual(["sale-old", "sale-new"]);
    expect(result.accountDebt).toBe("0.0000");
  });
});
