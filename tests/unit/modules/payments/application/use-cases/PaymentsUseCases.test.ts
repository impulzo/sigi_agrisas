import { InMemoryPaymentRepository } from "@/modules/payments/infrastructure/repositories/InMemoryPaymentRepository";
import { RegisterPaymentUseCase } from "@/modules/payments/application/use-cases/RegisterPaymentUseCase";
import { CancelPaymentUseCase } from "@/modules/payments/application/use-cases/CancelPaymentUseCase";
import { ListPaymentsUseCase } from "@/modules/payments/application/use-cases/ListPaymentsUseCase";
import { GetPaymentUseCase } from "@/modules/payments/application/use-cases/GetPaymentUseCase";
import { ListPaymentsBySaleUseCase } from "@/modules/payments/application/use-cases/ListPaymentsBySaleUseCase";
import { GetPaymentHistoryReportUseCase } from "@/modules/payments/application/use-cases/GetPaymentHistoryReportUseCase";
import { PaymentNotFoundError } from "@/modules/payments/domain/errors/PaymentNotFoundError";
import { PaymentAlreadyCancelledError } from "@/modules/payments/domain/errors/PaymentAlreadyCancelledError";
import { PaymentExceedsDueAmountError } from "@/modules/payments/domain/errors/PaymentExceedsDueAmountError";
import { SaleNotPayableError } from "@/modules/payments/domain/errors/SaleNotPayableError";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const BRANCH_ID = "branch-1";
const SALE_ID = "sale-1";
const CUSTOMER_ID = "customer-1";
const PM_ID = "pm-recibo";
const FOLIO_ID = "folio-recibo";

function makeRepo() {
  const repo = new InMemoryPaymentRepository();
  repo.seedSale({
    id: SALE_ID,
    folioCode: "VNT-000001",
    folioNumber: 1,
    branchId: BRANCH_ID,
    customerId: CUSTOMER_ID,
    total: 1000,
    paidAmount: 0,
    paymentStatus: "pending",
    isCredit: true,
    status: "completed",
  });
  repo.seedCustomer({ id: CUSTOMER_ID, currentBalance: 1000, creditLimit: 5000 });
  return repo;
}

function makeRegisterUseCase(repo: InMemoryPaymentRepository) {
  return new RegisterPaymentUseCase(repo);
}

describe("RegisterPaymentUseCase", () => {
  it("creates a payment and returns status=completed with updated sale totals", async () => {
    const repo = makeRepo();
    const useCase = makeRegisterUseCase(repo);

    const result = await useCase.execute({
      saleId: SALE_ID,
      paymentMethodId: PM_ID,
      folioId: FOLIO_ID,
      amount: 300,
      notes: "Abono parcial",
      userId: USER_ID,
      callerBranchId: null,
    });

    expect(result.dto.status).toBe("completed");
    expect(result.dto.amount).toBe("300.0000");
    expect(result.dto.sale.paidAmount).toBe("300.0000");
    expect(result.dto.sale.paymentStatus).toBe("partial");
    expect(result.branchId).toBe(BRANCH_ID);
  });

  it("marks sale as paid when full amount is registered", async () => {
    const repo = makeRepo();
    const useCase = makeRegisterUseCase(repo);

    const result = await useCase.execute({
      saleId: SALE_ID,
      paymentMethodId: PM_ID,
      folioId: FOLIO_ID,
      amount: 1000,
      notes: null,
      userId: USER_ID,
      callerBranchId: null,
    });

    expect(result.dto.sale.paymentStatus).toBe("paid");
    expect(result.dto.sale.paidAmount).toBe("1000.0000");
  });

  it("throws SaleNotPayableError when sale is not credit", async () => {
    const repo = new InMemoryPaymentRepository();
    repo.seedSale({
      id: SALE_ID,
      folioCode: "VNT-000001",
      folioNumber: 1,
      branchId: BRANCH_ID,
      customerId: CUSTOMER_ID,
      total: 1000,
      paidAmount: 1000,
      paymentStatus: "paid",
      isCredit: false,
      status: "completed",
    });
    const useCase = makeRegisterUseCase(repo);

    await expect(
      useCase.execute({ saleId: SALE_ID, paymentMethodId: PM_ID, folioId: FOLIO_ID, amount: 100, notes: null, userId: USER_ID, callerBranchId: null })
    ).rejects.toBeInstanceOf(SaleNotPayableError);
  });

  it("throws SaleNotPayableError when sale status is cancelled", async () => {
    const repo = new InMemoryPaymentRepository();
    repo.seedSale({
      id: SALE_ID,
      folioCode: "VNT-000001",
      folioNumber: 1,
      branchId: BRANCH_ID,
      customerId: CUSTOMER_ID,
      total: 1000,
      paidAmount: 0,
      paymentStatus: "pending",
      isCredit: true,
      status: "cancelled",
    });
    const useCase = makeRegisterUseCase(repo);

    const err = await useCase
      .execute({ saleId: SALE_ID, paymentMethodId: PM_ID, folioId: FOLIO_ID, amount: 100, notes: null, userId: USER_ID, callerBranchId: null })
      .catch((e) => e);
    expect(err).toBeInstanceOf(SaleNotPayableError);
    expect(err.status).toBe("cancelled");
  });

  it("throws PaymentExceedsDueAmountError when amount exceeds remaining", async () => {
    const repo = makeRepo();
    const useCase = makeRegisterUseCase(repo);

    const err = await useCase
      .execute({ saleId: SALE_ID, paymentMethodId: PM_ID, folioId: FOLIO_ID, amount: 1001, notes: null, userId: USER_ID, callerBranchId: null })
      .catch((e) => e);

    expect(err).toBeInstanceOf(PaymentExceedsDueAmountError);
    expect(err.due).toBe("1000.0000");
  });

  it("throws error when sale not found", async () => {
    const repo = new InMemoryPaymentRepository();
    const useCase = makeRegisterUseCase(repo);

    await expect(
      useCase.execute({ saleId: "nonexistent", paymentMethodId: PM_ID, folioId: FOLIO_ID, amount: 100, notes: null, userId: USER_ID, callerBranchId: null })
    ).rejects.toThrow("Sale not found");
  });

  it("allows sequential partial payments up to full amount", async () => {
    const repo = makeRepo();
    const useCase = makeRegisterUseCase(repo);

    await useCase.execute({ saleId: SALE_ID, paymentMethodId: PM_ID, folioId: FOLIO_ID, amount: 400, notes: null, userId: USER_ID, callerBranchId: null });
    const final = await useCase.execute({
      saleId: SALE_ID,
      paymentMethodId: PM_ID,
      folioId: FOLIO_ID,
      amount: 600,
      notes: null,
      userId: USER_ID,
      callerBranchId: null,
    });

    expect(final.dto.sale.paymentStatus).toBe("paid");
    expect(final.dto.sale.paidAmount).toBe("1000.0000");
  });
});

describe("CancelPaymentUseCase", () => {
  async function seedWithPayment(amount = 300) {
    const repo = makeRepo();
    const registerUC = makeRegisterUseCase(repo);
    const registered = await registerUC.execute({
      saleId: SALE_ID,
      paymentMethodId: PM_ID,
      folioId: FOLIO_ID,
      amount,
      notes: null,
      userId: USER_ID,
      callerBranchId: null,
    });
    const cancelUC = new CancelPaymentUseCase(repo);
    return { repo, cancelUC, paymentId: registered.dto.id };
  }

  it("cancels a completed payment and reverts sale paidAmount", async () => {
    const { cancelUC, paymentId } = await seedWithPayment(300);

    const result = await cancelUC.execute(paymentId, "Cliente arrepentido", USER_ID);

    expect(result.dto.status).toBe("cancelled");
    expect(result.dto.cancellationReason).toBe("Cliente arrepentido");
    expect(result.dto.sale.paidAmount).toBe("0.0000");
    expect(result.dto.sale.paymentStatus).toBe("pending");
  });

  it("throws PaymentNotFoundError for unknown id", async () => {
    const repo = makeRepo();
    const cancelUC = new CancelPaymentUseCase(repo);

    await expect(cancelUC.execute("nonexistent-id", null, USER_ID)).rejects.toBeInstanceOf(PaymentNotFoundError);
  });

  it("throws PaymentAlreadyCancelledError on double cancel", async () => {
    const { cancelUC, paymentId } = await seedWithPayment(300);

    await cancelUC.execute(paymentId, null, USER_ID);
    await expect(cancelUC.execute(paymentId, null, USER_ID)).rejects.toBeInstanceOf(PaymentAlreadyCancelledError);
  });

  it("after cancel of partial payment, sale goes back to partial if prior payment remains", async () => {
    const repo = makeRepo();
    const registerUC = makeRegisterUseCase(repo);

    await registerUC.execute({ saleId: SALE_ID, paymentMethodId: PM_ID, folioId: FOLIO_ID, amount: 400, notes: null, userId: USER_ID, callerBranchId: null });
    const secondResult = await registerUC.execute({
      saleId: SALE_ID,
      paymentMethodId: PM_ID,
      folioId: FOLIO_ID,
      amount: 200,
      notes: null,
      userId: USER_ID,
      callerBranchId: null,
    });
    const cancelUC = new CancelPaymentUseCase(repo);
    const result = await cancelUC.execute(secondResult.dto.id, null, USER_ID);

    expect(result.dto.sale.paidAmount).toBe("400.0000");
    expect(result.dto.sale.paymentStatus).toBe("partial");
  });
});

describe("ListPaymentsUseCase", () => {
  it("returns empty list when no payments exist", async () => {
    const repo = new InMemoryPaymentRepository();
    const useCase = new ListPaymentsUseCase(repo);

    const result = await useCase.execute({}, { page: 1, pageSize: 20 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("filters by branchId", async () => {
    const repo = makeRepo();
    repo.seedSale({ id: "sale-2", folioCode: "VNT-2", folioNumber: 2, branchId: "branch-2", customerId: CUSTOMER_ID, total: 500, paidAmount: 0, paymentStatus: "pending", isCredit: true, status: "completed" });

    const registerUC = makeRegisterUseCase(repo);
    await registerUC.execute({ saleId: SALE_ID, paymentMethodId: PM_ID, folioId: FOLIO_ID, amount: 100, notes: null, userId: USER_ID, callerBranchId: null });

    const useCase = new ListPaymentsUseCase(repo);
    const result = await useCase.execute({ branchId: "branch-2" }, { page: 1, pageSize: 20 });

    expect(result.total).toBe(0);
  });

  it("paginates correctly", async () => {
    const repo = makeRepo();
    const registerUC = makeRegisterUseCase(repo);

    for (let i = 0; i < 5; i++) {
      await registerUC.execute({ saleId: SALE_ID, paymentMethodId: PM_ID, folioId: FOLIO_ID, amount: 50, notes: null, userId: USER_ID, callerBranchId: null });
    }

    const useCase = new ListPaymentsUseCase(repo);
    const page1 = await useCase.execute({}, { page: 1, pageSize: 3 });
    const page2 = await useCase.execute({}, { page: 2, pageSize: 3 });

    expect(page1.total).toBe(5);
    expect(page1.items).toHaveLength(3);
    expect(page2.items).toHaveLength(2);
  });

  it("filters by status", async () => {
    const repo = makeRepo();
    const registerUC = makeRegisterUseCase(repo);
    const cancelUC = new CancelPaymentUseCase(repo);

    const r1 = await registerUC.execute({ saleId: SALE_ID, paymentMethodId: PM_ID, folioId: FOLIO_ID, amount: 100, notes: null, userId: USER_ID, callerBranchId: null });
    await registerUC.execute({ saleId: SALE_ID, paymentMethodId: PM_ID, folioId: FOLIO_ID, amount: 100, notes: null, userId: USER_ID, callerBranchId: null });
    await cancelUC.execute(r1.dto.id, null, USER_ID);

    const useCase = new ListPaymentsUseCase(repo);
    const completedOnly = await useCase.execute({ statuses: ["completed"] }, { page: 1, pageSize: 20 });
    const cancelledOnly = await useCase.execute({ statuses: ["cancelled"] }, { page: 1, pageSize: 20 });

    expect(completedOnly.total).toBe(1);
    expect(cancelledOnly.total).toBe(1);
  });
});

describe("GetPaymentUseCase", () => {
  it("returns payment data for existing id", async () => {
    const repo = makeRepo();
    const registerUC = makeRegisterUseCase(repo);
    const registered = await registerUC.execute({
      saleId: SALE_ID,
      paymentMethodId: PM_ID,
      folioId: FOLIO_ID,
      amount: 500,
      notes: null,
      userId: USER_ID,
      callerBranchId: null,
    });

    const useCase = new GetPaymentUseCase(repo);
    const result = await useCase.execute(registered.dto.id);

    expect(result.data.payment.id).toBe(registered.dto.id);
    expect(result.branchId).toBe(BRANCH_ID);
  });

  it("throws PaymentNotFoundError for unknown id", async () => {
    const repo = new InMemoryPaymentRepository();
    const useCase = new GetPaymentUseCase(repo);

    await expect(useCase.execute("nonexistent")).rejects.toBeInstanceOf(PaymentNotFoundError);
  });
});

describe("ListPaymentsBySaleUseCase", () => {
  it("returns all payments for a sale with aggregated totals", async () => {
    const repo = makeRepo();
    const registerUC = makeRegisterUseCase(repo);
    await registerUC.execute({ saleId: SALE_ID, paymentMethodId: PM_ID, folioId: FOLIO_ID, amount: 300, notes: null, userId: USER_ID, callerBranchId: null });
    await registerUC.execute({ saleId: SALE_ID, paymentMethodId: PM_ID, folioId: FOLIO_ID, amount: 200, notes: null, userId: USER_ID, callerBranchId: null });

    const useCase = new ListPaymentsBySaleUseCase(repo);
    const result = await useCase.execute(SALE_ID);

    expect(result.result.items).toHaveLength(2);
    expect(result.result.saleTotal).toBe("1000.0000");
    expect(result.result.salePaidAmount).toBe("500.0000");
    expect(result.result.saleDueAmount).toBe("500.0000");
    expect(result.result.salePaymentStatus).toBe("partial");
  });

  it("includes cancelled payments in the list", async () => {
    const repo = makeRepo();
    const registerUC = makeRegisterUseCase(repo);
    const cancelUC = new CancelPaymentUseCase(repo);

    const r1 = await registerUC.execute({ saleId: SALE_ID, paymentMethodId: PM_ID, folioId: FOLIO_ID, amount: 300, notes: null, userId: USER_ID, callerBranchId: null });
    await cancelUC.execute(r1.dto.id, "Test", USER_ID);

    const useCase = new ListPaymentsBySaleUseCase(repo);
    const result = await useCase.execute(SALE_ID);

    expect(result.result.items).toHaveLength(1);
    expect(result.result.items[0].payment.status).toBe("cancelled");
    expect(result.result.salePaidAmount).toBe("0.0000");
    expect(result.result.salePaymentStatus).toBe("pending");
  });

  it("throws when sale not found", async () => {
    const repo = new InMemoryPaymentRepository();
    const useCase = new ListPaymentsBySaleUseCase(repo);

    await expect(useCase.execute("nonexistent-sale")).rejects.toThrow("Sale not found");
  });
});

describe("GetPaymentHistoryReportUseCase", () => {
  async function seedMultiplePayments(repo: InMemoryPaymentRepository, count: number) {
    const registerUC = makeRegisterUseCase(repo);
    for (let i = 0; i < count; i++) {
      await registerUC.execute({ saleId: SALE_ID, paymentMethodId: PM_ID, folioId: FOLIO_ID, amount: 10, notes: null, userId: USER_ID, callerBranchId: null });
    }
  }

  it("returns paginated JSON results with aggregates", async () => {
    const repo = makeRepo();
    await seedMultiplePayments(repo, 5);

    const useCase = new GetPaymentHistoryReportUseCase(repo);
    const result = await useCase.execute({ filters: {}, page: 1, pageSize: 3, forPdf: false });

    expect(result.total).toBe(5);
    expect(result.items).toHaveLength(3);
    expect(result.tooLarge).toBe(false);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(3);
    expect(result.completedCount).toBe(5);
    expect(result.cancelledCount).toBe(0);
    expect(result.totalAmountCompleted).toBe("50.0000");
  });

  it("returns all items for PDF mode without pagination", async () => {
    const repo = makeRepo();
    await seedMultiplePayments(repo, 5);

    const useCase = new GetPaymentHistoryReportUseCase(repo);
    const result = await useCase.execute({ filters: {}, page: 1, pageSize: 10, forPdf: true });

    expect(result.items).toHaveLength(5);
    expect(result.tooLarge).toBe(false);
  });

  it("sets tooLarge=true when total exceeds 10000 for PDF mode", async () => {
    const repo = makeRepo();

    // Inject a large findHistory result by seeding many payments
    // We simulate this by overriding findHistory with a spy
    const mockRepo = {
      ...repo,
      findHistory: async () => ({
        items: [],
        total: 10001,
        totalAmountCompleted: 0,
        totalAmountCancelled: 0,
        completedCount: 10001,
        cancelledCount: 0,
      }),
    } as unknown as InMemoryPaymentRepository;

    const useCase = new GetPaymentHistoryReportUseCase(mockRepo);
    const result = await useCase.execute({ filters: {}, page: 1, pageSize: 10, forPdf: true });

    expect(result.tooLarge).toBe(true);
    expect(result.total).toBe(10001);
  });

  it("filters by branchId", async () => {
    const repo = makeRepo();
    await seedMultiplePayments(repo, 3);

    const useCase = new GetPaymentHistoryReportUseCase(repo);
    const result = await useCase.execute({ filters: { branchId: "other-branch" }, page: 1, pageSize: 20, forPdf: false });

    expect(result.total).toBe(0);
    expect(result.completedCount).toBe(0);
  });

  it("correctly sums completed vs cancelled amounts", async () => {
    const repo = makeRepo();
    const registerUC = makeRegisterUseCase(repo);
    const cancelUC = new CancelPaymentUseCase(repo);

    const r1 = await registerUC.execute({ saleId: SALE_ID, paymentMethodId: PM_ID, folioId: FOLIO_ID, amount: 200, notes: null, userId: USER_ID, callerBranchId: null });
    await registerUC.execute({ saleId: SALE_ID, paymentMethodId: PM_ID, folioId: FOLIO_ID, amount: 150, notes: null, userId: USER_ID, callerBranchId: null });
    await cancelUC.execute(r1.dto.id, "Test", USER_ID);

    const useCase = new GetPaymentHistoryReportUseCase(repo);
    const result = await useCase.execute({ filters: {}, page: 1, pageSize: 20, forPdf: false });

    expect(result.total).toBe(2);
    expect(result.completedCount).toBe(1);
    expect(result.cancelledCount).toBe(1);
    expect(result.totalAmountCompleted).toBe("150.0000");
    expect(result.totalAmountCancelled).toBe("200.0000");
  });
});
