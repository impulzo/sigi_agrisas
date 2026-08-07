import { CreatePurchaseUseCase } from "@/modules/purchases/application/use-cases/CreatePurchaseUseCase";
import { CancelPurchaseUseCase } from "@/modules/purchases/application/use-cases/CancelPurchaseUseCase";
import { InMemoryPurchaseRepository } from "@/modules/purchases/infrastructure/repositories/InMemoryPurchaseRepository";
import { ProviderPayment } from "@/modules/purchases/domain/entities/ProviderPayment";
import { PurchaseNotFoundError } from "@/modules/purchases/domain/errors/PurchaseNotFoundError";
import { PurchaseAlreadyCancelledError } from "@/modules/purchases/domain/errors/PurchaseAlreadyCancelledError";
import { PurchaseHasActiveProviderPaymentsError } from "@/modules/purchases/domain/errors/PurchaseHasActiveProviderPaymentsError";

const PROVIDER = "provider-1";
const BRANCH = "branch-1";
const CASH_PM = "pm-cash";
const CREDIT_PM = "pm-credit";
const PRODUCT = "product-1";
const CREATOR = "00000000-0000-0000-0000-000000000001";

function makeRepo(): InMemoryPurchaseRepository {
  const repo = new InMemoryPurchaseRepository();
  repo.seedProvider({ id: PROVIDER, code: "PROV_TEST", name: "Proveedor Uno", rfc: "PRO010101AAA", isActive: true, currentBalance: 0 });
  repo.seedBranch({ id: BRANCH, name: "Matriz", isActive: true });
  repo.seedPaymentMethod({ id: CASH_PM, code: "EFECTIVO", isCredit: false, isActive: true });
  repo.seedPaymentMethod({ id: CREDIT_PM, code: "CREDITO", isCredit: true, isActive: true });
  repo.seedProduct({ id: PRODUCT, code: "PROD001", name: "Producto Uno", ivaRate: null, iepsRate: null, isTaxable: true, isActive: true });
  return repo;
}

describe("CancelPurchaseUseCase", () => {
  it("cancels a cash purchase", async () => {
    const repo = makeRepo();
    const createUseCase = new CreatePurchaseUseCase(repo);
    const cancelUseCase = new CancelPurchaseUseCase(repo);

    const created = await createUseCase.execute({
      providerId: PROVIDER,
      branchId: BRANCH,
      paymentMethodId: CASH_PM,
      creatorId: CREATOR,
      items: [{ productId: PRODUCT, quantity: 1, unitCost: 100 }],
    });

    const result = await cancelUseCase.execute({
      id: created.dto.id,
      cancelledBy: CREATOR,
      cancellationReason: "Error de captura",
    });

    expect(result.dto.status).toBe("cancelled");
    expect(result.dto.cancellationReason).toBe("Error de captura");
  });

  it("reverts provider balance when cancelling an unpaid credit purchase", async () => {
    const repo = makeRepo();
    const createUseCase = new CreatePurchaseUseCase(repo);
    const cancelUseCase = new CancelPurchaseUseCase(repo);

    const created = await createUseCase.execute({
      providerId: PROVIDER,
      branchId: BRANCH,
      paymentMethodId: CREDIT_PM,
      creatorId: CREATOR,
      items: [{ productId: PRODUCT, quantity: 1, unitCost: 100 }],
    });
    expect(repo.providers.get(PROVIDER)!.currentBalance).toBe(100);

    await cancelUseCase.execute({ id: created.dto.id, cancelledBy: CREATOR, cancellationReason: null });

    expect(repo.providers.get(PROVIDER)!.currentBalance).toBe(0);
  });

  it("throws PurchaseNotFoundError when purchase does not exist", async () => {
    const repo = makeRepo();
    const cancelUseCase = new CancelPurchaseUseCase(repo);

    await expect(
      cancelUseCase.execute({ id: "nonexistent", cancelledBy: CREATOR, cancellationReason: null })
    ).rejects.toBeInstanceOf(PurchaseNotFoundError);
  });

  it("throws PurchaseAlreadyCancelledError when already cancelled", async () => {
    const repo = makeRepo();
    const createUseCase = new CreatePurchaseUseCase(repo);
    const cancelUseCase = new CancelPurchaseUseCase(repo);

    const created = await createUseCase.execute({
      providerId: PROVIDER,
      branchId: BRANCH,
      paymentMethodId: CASH_PM,
      creatorId: CREATOR,
      items: [{ productId: PRODUCT, quantity: 1, unitCost: 100 }],
    });
    await cancelUseCase.execute({ id: created.dto.id, cancelledBy: CREATOR, cancellationReason: null });

    await expect(
      cancelUseCase.execute({ id: created.dto.id, cancelledBy: CREATOR, cancellationReason: null })
    ).rejects.toBeInstanceOf(PurchaseAlreadyCancelledError);
  });

  it("throws PurchaseHasActiveProviderPaymentsError when active payments exist", async () => {
    const repo = makeRepo();
    const createUseCase = new CreatePurchaseUseCase(repo);
    const cancelUseCase = new CancelPurchaseUseCase(repo);

    const created = await createUseCase.execute({
      providerId: PROVIDER,
      branchId: BRANCH,
      paymentMethodId: CREDIT_PM,
      creatorId: CREATOR,
      items: [{ productId: PRODUCT, quantity: 1, unitCost: 100 }],
    });

    repo.providerPaymentsByPurchase.set(created.dto.id, [
      ProviderPayment.create("pp-1", {
        purchaseId: created.dto.id,
        providerId: PROVIDER,
        branchId: BRANCH,
        folioId: "folio-pp",
        folioNumber: 1,
        folioCode: "PP-000001",
        creatorId: CREATOR,
        amount: 50,
        status: "completed",
        notes: null,
        paidAt: new Date(),
        cancelledAt: null,
        cancelledBy: null,
        cancellationReason: null,
      }),
    ]);

    await expect(
      cancelUseCase.execute({ id: created.dto.id, cancelledBy: CREATOR, cancellationReason: null })
    ).rejects.toBeInstanceOf(PurchaseHasActiveProviderPaymentsError);
  });
});
