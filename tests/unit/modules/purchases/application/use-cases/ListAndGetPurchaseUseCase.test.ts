import { CreatePurchaseUseCase } from "@/modules/purchases/application/use-cases/CreatePurchaseUseCase";
import { ListPurchasesUseCase } from "@/modules/purchases/application/use-cases/ListPurchasesUseCase";
import { GetPurchaseUseCase } from "@/modules/purchases/application/use-cases/GetPurchaseUseCase";
import { InMemoryPurchaseRepository } from "@/modules/purchases/infrastructure/repositories/InMemoryPurchaseRepository";
import { ProviderPayment } from "@/modules/purchases/domain/entities/ProviderPayment";
import { PurchaseNotFoundError } from "@/modules/purchases/domain/errors/PurchaseNotFoundError";

const PROVIDER_A = "provider-a";
const PROVIDER_B = "provider-b";
const BRANCH = "branch-1";
const CASH_PM = "pm-cash";
const CREDIT_PM = "pm-credit";
const PRODUCT = "product-1";
const CREATOR = "00000000-0000-0000-0000-000000000001";

function makeRepo(): InMemoryPurchaseRepository {
  const repo = new InMemoryPurchaseRepository();
  repo.seedProvider({ id: PROVIDER_A, code: "PROV_A", name: "Proveedor A", rfc: "AAA010101AAA", isActive: true, currentBalance: 0 });
  repo.seedProvider({ id: PROVIDER_B, code: "PROV_B", name: "Proveedor B", rfc: "BBB010101AAA", isActive: true, currentBalance: 0 });
  repo.seedBranch({ id: BRANCH, name: "Matriz", isActive: true });
  repo.seedPaymentMethod({ id: CASH_PM, code: "EFECTIVO", isCredit: false, isActive: true });
  repo.seedPaymentMethod({ id: CREDIT_PM, code: "CREDITO", isCredit: true, isActive: true });
  repo.seedProduct({ id: PRODUCT, code: "PROD001", name: "Producto Uno", ivaRate: null, iepsRate: null, isTaxable: true, isActive: true });
  return repo;
}

describe("ListPurchasesUseCase / GetPurchaseUseCase", () => {
  it("filters the list by providerId", async () => {
    const repo = makeRepo();
    const createUseCase = new CreatePurchaseUseCase(repo);
    const listUseCase = new ListPurchasesUseCase(repo);

    await createUseCase.execute({ providerId: PROVIDER_A, branchId: BRANCH, paymentMethodId: CASH_PM, creatorId: CREATOR, items: [{ productId: PRODUCT, quantity: 1, unitCost: 100 }] });
    await createUseCase.execute({ providerId: PROVIDER_B, branchId: BRANCH, paymentMethodId: CASH_PM, creatorId: CREATOR, items: [{ productId: PRODUCT, quantity: 1, unitCost: 100 }] });

    const result = await listUseCase.execute({ page: 1, pageSize: 20, providerId: PROVIDER_A });

    expect(result.total).toBe(1);
    expect(result.items[0].providerId).toBe(PROVIDER_A);
  });

  it("returns detail with items and provider payments", async () => {
    const repo = makeRepo();
    const createUseCase = new CreatePurchaseUseCase(repo);
    const getUseCase = new GetPurchaseUseCase(repo);

    const created = await createUseCase.execute({
      providerId: PROVIDER_A,
      branchId: BRANCH,
      paymentMethodId: CREDIT_PM,
      creatorId: CREATOR,
      items: [{ productId: PRODUCT, quantity: 2, unitCost: 100 }],
    });

    repo.providerPaymentsByPurchase.set(created.dto.id, [
      ProviderPayment.create("pp-1", {
        purchaseId: created.dto.id,
        providerId: PROVIDER_A,
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

    const result = await getUseCase.execute(created.dto.id);

    expect(result.dto.items).toHaveLength(1);
    expect(result.dto.items[0].quantity).toBe(2);
    expect(result.dto.providerPayments).toHaveLength(1);
    expect(result.dto.providerPayments[0].amount).toBe("50.0000");
  });

  it("throws PurchaseNotFoundError for a nonexistent id", async () => {
    const repo = makeRepo();
    const getUseCase = new GetPurchaseUseCase(repo);

    await expect(getUseCase.execute("nonexistent")).rejects.toBeInstanceOf(PurchaseNotFoundError);
  });
});
