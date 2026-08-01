import { RegisterProviderPaymentUseCase } from "@/modules/purchases/application/use-cases/RegisterProviderPaymentUseCase";
import { CancelProviderPaymentUseCase } from "@/modules/purchases/application/use-cases/CancelProviderPaymentUseCase";
import { InMemoryProviderPaymentRepository } from "@/modules/purchases/infrastructure/repositories/InMemoryProviderPaymentRepository";
import { PurchaseNotFoundError } from "@/modules/purchases/domain/errors/PurchaseNotFoundError";
import { PurchaseNotPayableError } from "@/modules/purchases/domain/errors/PurchaseNotPayableError";
import { ProviderPaymentExceedsDueAmountError } from "@/modules/purchases/domain/errors/ProviderPaymentExceedsDueAmountError";
import { ProviderPaymentAlreadyCancelledError } from "@/modules/purchases/domain/errors/ProviderPaymentAlreadyCancelledError";

const PURCHASE = "purchase-1";
const PROVIDER = "provider-1";
const BRANCH = "branch-1";
const CREATOR = "00000000-0000-0000-0000-000000000001";

function makeRepo(overrides: { isCredit?: boolean; total?: number; paidAmount?: number } = {}): InMemoryProviderPaymentRepository {
  const repo = new InMemoryProviderPaymentRepository();
  repo.seedProvider({ id: PROVIDER, currentBalance: overrides.total ?? 1000 });
  repo.seedPurchase({
    id: PURCHASE,
    folioCode: "CP-000001",
    folioNumber: 1,
    branchId: BRANCH,
    providerId: PROVIDER,
    total: overrides.total ?? 1000,
    paidAmount: overrides.paidAmount ?? 0,
    paymentStatus: "pending",
    isCredit: overrides.isCredit ?? true,
  });
  return repo;
}

describe("RegisterProviderPaymentUseCase", () => {
  it("registers a partial payment and decrements provider balance", async () => {
    const repo = makeRepo();
    const useCase = new RegisterProviderPaymentUseCase(repo);

    const result = await useCase.execute({ purchaseId: PURCHASE, amount: 300, creatorId: CREATOR });

    expect(result.dto.purchase.paidAmount).toBe("300.0000");
    expect(result.dto.purchase.paymentStatus).toBe("partial");
    expect(repo.providers.get(PROVIDER)!.currentBalance).toBe(700);
  });

  it("throws PurchaseNotFoundError when purchase does not exist", async () => {
    const repo = new InMemoryProviderPaymentRepository();
    const useCase = new RegisterProviderPaymentUseCase(repo);

    await expect(
      useCase.execute({ purchaseId: "nonexistent", amount: 100, creatorId: CREATOR })
    ).rejects.toBeInstanceOf(PurchaseNotFoundError);
  });

  it("throws PurchaseNotPayableError for a cash purchase", async () => {
    const repo = makeRepo({ isCredit: false });
    const useCase = new RegisterProviderPaymentUseCase(repo);

    await expect(
      useCase.execute({ purchaseId: PURCHASE, amount: 100, creatorId: CREATOR })
    ).rejects.toBeInstanceOf(PurchaseNotPayableError);
  });

  it("throws ProviderPaymentExceedsDueAmountError when amount exceeds remaining", async () => {
    const repo = makeRepo({ total: 1000, paidAmount: 800 });
    const useCase = new RegisterProviderPaymentUseCase(repo);

    await expect(
      useCase.execute({ purchaseId: PURCHASE, amount: 300, creatorId: CREATOR })
    ).rejects.toBeInstanceOf(ProviderPaymentExceedsDueAmountError);
  });

  it("full credit-purchase flow: partial payment → full payment → cancel last payment stays consistent", async () => {
    const repo = makeRepo({ total: 1000, paidAmount: 0 });
    const registerUseCase = new RegisterProviderPaymentUseCase(repo);
    const cancelUseCase = new CancelProviderPaymentUseCase(repo);

    const first = await registerUseCase.execute({ purchaseId: PURCHASE, amount: 400, creatorId: CREATOR });
    expect(first.dto.purchase.paidAmount).toBe("400.0000");
    expect(first.dto.purchase.paymentStatus).toBe("partial");
    expect(repo.providers.get(PROVIDER)!.currentBalance).toBe(600);

    const second = await registerUseCase.execute({ purchaseId: PURCHASE, amount: 600, creatorId: CREATOR });
    expect(second.dto.purchase.paidAmount).toBe("1000.0000");
    expect(second.dto.purchase.paymentStatus).toBe("paid");
    expect(repo.providers.get(PROVIDER)!.currentBalance).toBe(0);

    const cancelled = await cancelUseCase.execute({
      id: second.dto.id,
      cancelledBy: CREATOR,
      cancellationReason: "Error de registro",
    });
    expect(cancelled.dto.purchase.paidAmount).toBe("400.0000");
    expect(cancelled.dto.purchase.paymentStatus).toBe("partial");
    expect(repo.providers.get(PROVIDER)!.currentBalance).toBe(600);
  });

  it("throws ProviderPaymentAlreadyCancelledError on double cancel", async () => {
    const repo = makeRepo();
    const registerUseCase = new RegisterProviderPaymentUseCase(repo);
    const cancelUseCase = new CancelProviderPaymentUseCase(repo);

    const registered = await registerUseCase.execute({ purchaseId: PURCHASE, amount: 300, creatorId: CREATOR });
    await cancelUseCase.execute({ id: registered.dto.id, cancelledBy: CREATOR, cancellationReason: null });

    await expect(
      cancelUseCase.execute({ id: registered.dto.id, cancelledBy: CREATOR, cancellationReason: null })
    ).rejects.toBeInstanceOf(ProviderPaymentAlreadyCancelledError);
  });
});
