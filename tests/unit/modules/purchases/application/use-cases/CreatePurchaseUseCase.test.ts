import { CreatePurchaseUseCase } from "@/modules/purchases/application/use-cases/CreatePurchaseUseCase";
import { InMemoryPurchaseRepository } from "@/modules/purchases/infrastructure/repositories/InMemoryPurchaseRepository";
import { PurchaseItemsEmptyError } from "@/modules/purchases/domain/errors/PurchaseItemsEmptyError";
import { ProviderNotFoundOrInactiveError } from "@/modules/purchases/domain/errors/ProviderNotFoundOrInactiveError";
import { ProductNotFoundOrInactiveError } from "@/modules/purchases/domain/errors/ProductNotFoundOrInactiveError";

const PROVIDER = "provider-1";
const BRANCH = "branch-1";
const CASH_PM = "pm-cash";
const CREDIT_PM = "pm-credit";
const PRODUCT = "product-1";
const CREATOR = "00000000-0000-0000-0000-000000000001";

function seedBase(repo: InMemoryPurchaseRepository, overrides: { providerActive?: boolean; productActive?: boolean } = {}) {
  repo.seedProvider({ id: PROVIDER, name: "Proveedor Uno", rfc: "PRO010101AAA", isActive: overrides.providerActive ?? true, currentBalance: 0 });
  repo.seedBranch({ id: BRANCH, name: "Matriz", isActive: true });
  repo.seedPaymentMethod({ id: CASH_PM, code: "EFECTIVO", isCredit: false, isActive: true });
  repo.seedPaymentMethod({ id: CREDIT_PM, code: "CREDITO", isCredit: true, isActive: true });
  repo.seedProduct({
    id: PRODUCT,
    code: "PROD001",
    name: "Producto Uno",
    ivaRate: 0.16,
    iepsRate: null,
    isTaxable: true,
    isActive: overrides.productActive ?? true,
  });
}

describe("CreatePurchaseUseCase", () => {
  let repo: InMemoryPurchaseRepository;
  let useCase: CreatePurchaseUseCase;

  beforeEach(() => {
    repo = new InMemoryPurchaseRepository();
    useCase = new CreatePurchaseUseCase(repo);
    seedBase(repo);
  });

  it("throws PurchaseItemsEmptyError when no items provided", async () => {
    await expect(
      useCase.execute({ providerId: PROVIDER, branchId: BRANCH, paymentMethodId: CASH_PM, creatorId: CREATOR, items: [] })
    ).rejects.toBeInstanceOf(PurchaseItemsEmptyError);
  });

  it("creates a cash purchase fully paid", async () => {
    const result = await useCase.execute({
      providerId: PROVIDER,
      branchId: BRANCH,
      paymentMethodId: CASH_PM,
      creatorId: CREATOR,
      items: [{ productId: PRODUCT, quantity: 2, unitCost: 100 }],
    });

    expect(result.dto.status).toBe("completed");
    expect(result.dto.paymentStatus).toBe("paid");
    expect(result.dto.paidAmount).toBe("232.0000");
    expect(result.dto.total).toBe("232.0000");
    expect(result.dto.items).toHaveLength(1);
    expect(result.dto.items[0].productCodeSnapshot).toBe("PROD001");
  });

  it("creates a credit purchase pending payment and increments provider balance", async () => {
    const result = await useCase.execute({
      providerId: PROVIDER,
      branchId: BRANCH,
      paymentMethodId: CREDIT_PM,
      creatorId: CREATOR,
      items: [{ productId: PRODUCT, quantity: 1, unitCost: 100 }],
    });

    expect(result.dto.paymentStatus).toBe("pending");
    expect(result.dto.paidAmount).toBe("0.0000");
    expect(repo.providers.get(PROVIDER)!.currentBalance).toBe(116);
  });

  it("throws ProviderNotFoundOrInactiveError for inactive provider", async () => {
    repo = new InMemoryPurchaseRepository();
    useCase = new CreatePurchaseUseCase(repo);
    seedBase(repo, { providerActive: false });

    await expect(
      useCase.execute({
        providerId: PROVIDER,
        branchId: BRANCH,
        paymentMethodId: CASH_PM,
        creatorId: CREATOR,
        items: [{ productId: PRODUCT, quantity: 1, unitCost: 100 }],
      })
    ).rejects.toBeInstanceOf(ProviderNotFoundOrInactiveError);
  });

  it("throws ProductNotFoundOrInactiveError for inactive product", async () => {
    repo = new InMemoryPurchaseRepository();
    useCase = new CreatePurchaseUseCase(repo);
    seedBase(repo, { productActive: false });

    await expect(
      useCase.execute({
        providerId: PROVIDER,
        branchId: BRANCH,
        paymentMethodId: CASH_PM,
        creatorId: CREATOR,
        items: [{ productId: PRODUCT, quantity: 1, unitCost: 100 }],
      })
    ).rejects.toBeInstanceOf(ProductNotFoundOrInactiveError);
  });
});
