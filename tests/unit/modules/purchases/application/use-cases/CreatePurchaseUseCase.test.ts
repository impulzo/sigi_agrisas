import { CreatePurchaseUseCase } from "@/modules/purchases/application/use-cases/CreatePurchaseUseCase";
import { CancelPurchaseUseCase } from "@/modules/purchases/application/use-cases/CancelPurchaseUseCase";
import { InMemoryPurchaseRepository } from "@/modules/purchases/infrastructure/repositories/InMemoryPurchaseRepository";
import { PurchaseItemsEmptyError } from "@/modules/purchases/domain/errors/PurchaseItemsEmptyError";
import { ProviderNotFoundOrInactiveError } from "@/modules/purchases/domain/errors/ProviderNotFoundOrInactiveError";
import { ProductNotFoundOrInactiveError } from "@/modules/purchases/domain/errors/ProductNotFoundOrInactiveError";
import { SatUuidAlreadyExistsError } from "@/modules/purchases/domain/errors/SatUuidAlreadyExistsError";

const PROVIDER = "provider-1";
const BRANCH = "branch-1";
const CASH_PM = "pm-cash";
const CREDIT_PM = "pm-credit";
const PRODUCT = "product-1";
const CREATOR = "00000000-0000-0000-0000-000000000001";

function seedBase(repo: InMemoryPurchaseRepository, overrides: { providerActive?: boolean; productActive?: boolean } = {}) {
  repo.seedProvider({ id: PROVIDER, code: "PROV_TEST", name: "Proveedor Uno", rfc: "PRO010101AAA", isActive: overrides.providerActive ?? true, currentBalance: 0 });
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
    expect(result.dto.paidAmount).toBe("200.0000");
    expect(result.dto.total).toBe("200.0000");
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
    expect(repo.providers.get(PROVIDER)!.currentBalance).toBe(100);
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

  it("auto-creates a provider by RFC when newProvider is provided", async () => {
    const result = await useCase.execute({
      branchId: BRANCH,
      paymentMethodId: CASH_PM,
      creatorId: CREATOR,
      newProvider: { rfc: "XYZ010101AAA", name: "Proveedor Nuevo", taxRegime: "601" },
      items: [{ productId: PRODUCT, quantity: 1, unitCost: 100 }],
    });

    const created = Array.from(repo.providers.values()).find((p) => p.rfc === "XYZ010101AAA");
    expect(created).toBeDefined();
    expect(created!.code).toBe("PROV_XYZ010101AAA");
    expect(result.dto.providerId).toBe(created!.id);
  });

  it("reuses an existing provider when newProvider RFC already exists", async () => {
    const result = await useCase.execute({
      branchId: BRANCH,
      paymentMethodId: CASH_PM,
      creatorId: CREATOR,
      newProvider: { rfc: "PRO010101AAA", name: "Proveedor Uno" },
      items: [{ productId: PRODUCT, quantity: 1, unitCost: 100 }],
    });

    expect(result.dto.providerId).toBe(PROVIDER);
    expect(repo.providers.size).toBe(1);
  });

  it("persists CFDI metadata and purchasedAt", async () => {
    const purchasedAt = "2026-08-06T12:00:00Z";
    const invoiceDate = "2026-08-05T09:30:00Z";
    const result = await useCase.execute({
      providerId: PROVIDER,
      branchId: BRANCH,
      paymentMethodId: CASH_PM,
      creatorId: CREATOR,
      purchasedAt,
      satUuid: "123e4567-e89b-12d3-a456-426614174000",
      supplierInvoiceNumber: "A",
      invoiceDate,
      xmlFileName: "factura.xml",
      items: [{ productId: PRODUCT, quantity: 1, unitCost: 100 }],
    });

    expect(result.dto.satUuid).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(result.dto.supplierInvoiceNumber).toBe("A");
    expect(result.dto.invoiceDate).toBe(new Date(invoiceDate).toISOString());
    expect(result.dto.xmlFileName).toBe("factura.xml");
    expect(result.dto.purchasedAt).toBe(new Date(purchasedAt).toISOString());
  });

  it("persists manufactureDate on the inventory lot when lotNumber+expirationDate are also provided", async () => {
    await useCase.execute({
      providerId: PROVIDER,
      branchId: BRANCH,
      paymentMethodId: CASH_PM,
      creatorId: CREATOR,
      items: [
        {
          productId: PRODUCT,
          quantity: 1,
          unitCost: 100,
          lotNumber: "LOT-1",
          expirationDate: new Date("2027-01-01"),
          manufactureDate: new Date("2026-01-01"),
        },
      ],
    });

    const lots = Array.from(repo.inventoryLots.values());
    expect(lots).toHaveLength(1);
    expect(lots[0].manufactureDate).toEqual(new Date("2026-01-01"));
  });

  it("does not create an inventory lot when only manufactureDate is provided (no lotNumber/expirationDate)", async () => {
    await useCase.execute({
      providerId: PROVIDER,
      branchId: BRANCH,
      paymentMethodId: CASH_PM,
      creatorId: CREATOR,
      items: [{ productId: PRODUCT, quantity: 1, unitCost: 100, manufactureDate: new Date("2026-01-01") }],
    });

    expect(repo.inventoryLots.size).toBe(0);
  });

  it("persists manufactureDate as null when a complete lot is captured without it", async () => {
    await useCase.execute({
      providerId: PROVIDER,
      branchId: BRANCH,
      paymentMethodId: CASH_PM,
      creatorId: CREATOR,
      items: [
        { productId: PRODUCT, quantity: 1, unitCost: 100, lotNumber: "LOT-2", expirationDate: new Date("2027-01-01") },
      ],
    });

    const lots = Array.from(repo.inventoryLots.values());
    expect(lots).toHaveLength(1);
    expect(lots[0].manufactureDate).toBeNull();
  });

  it("throws SatUuidAlreadyExistsError when satUuid is duplicated", async () => {
    const base = {
      providerId: PROVIDER,
      branchId: BRANCH,
      paymentMethodId: CASH_PM,
      creatorId: CREATOR,
      satUuid: "123e4567-e89b-12d3-a456-426614174000",
      items: [{ productId: PRODUCT, quantity: 1, unitCost: 100 }],
    };
    await useCase.execute(base);
    await expect(useCase.execute(base)).rejects.toBeInstanceOf(SatUuidAlreadyExistsError);
  });

  it("updates the product's acquisitionPrice to the line's unitCost on completion", async () => {
    await useCase.execute({
      providerId: PROVIDER,
      branchId: BRANCH,
      paymentMethodId: CASH_PM,
      creatorId: CREATOR,
      items: [{ productId: PRODUCT, quantity: 1, unitCost: 52.3 }],
    });

    expect(repo.products.get(PRODUCT)!.acquisitionPrice).toBe(52.3);
  });

  it("last processed line wins when a purchase repeats the same product", async () => {
    await useCase.execute({
      providerId: PROVIDER,
      branchId: BRANCH,
      paymentMethodId: CASH_PM,
      creatorId: CREATOR,
      items: [
        { productId: PRODUCT, quantity: 1, unitCost: 40 },
        { productId: PRODUCT, quantity: 1, unitCost: 45 },
      ],
    });

    expect(repo.products.get(PRODUCT)!.acquisitionPrice).toBe(45);
  });

  it("cancelling a purchase does not revert the product's acquisitionPrice", async () => {
    const result = await useCase.execute({
      providerId: PROVIDER,
      branchId: BRANCH,
      paymentMethodId: CASH_PM,
      creatorId: CREATOR,
      items: [{ productId: PRODUCT, quantity: 1, unitCost: 52.3 }],
    });

    const cancelUseCase = new CancelPurchaseUseCase(repo);
    await cancelUseCase.execute({ id: result.dto.id, cancelledBy: CREATOR, cancellationReason: "test" });

    expect(repo.products.get(PRODUCT)!.acquisitionPrice).toBe(52.3);
  });
});
