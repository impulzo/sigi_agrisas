import { GetPurchasesReportUseCase } from "@/modules/reports/application/use-cases/GetPurchasesReportUseCase";
import { InMemoryPurchaseRepository } from "@/modules/purchases/infrastructure/repositories/InMemoryPurchaseRepository";
import { formatMoney as money } from "@/shared/domain/services/formatMoney";

const GEN = { userId: "u1", email: "op@test.com" };
const PROVIDER_ID = "prov-1";
const BRANCH_ID = "branch-1";
const PM_ID = "pm-1";
const PRODUCT_ID = "prod-1";

function makeRepo(): InMemoryPurchaseRepository {
  const repo = new InMemoryPurchaseRepository();
  repo.seedProvider({ id: PROVIDER_ID, code: "PROV1", name: "Proveedor Uno", rfc: "AAA010101AAA", isActive: true, currentBalance: 0 });
  repo.seedBranch({ id: BRANCH_ID, name: "Matriz", isActive: true });
  repo.seedPaymentMethod({ id: PM_ID, code: "EFE", isCredit: false, isActive: true });
  repo.seedProduct({ id: PRODUCT_ID, code: "P001", name: "Fertilizante", ivaRate: 0.16, iepsRate: null, isTaxable: true, isActive: true });
  return repo;
}

async function seedPurchase(repo: InMemoryPurchaseRepository, over: { purchasedAt?: Date; unitCost?: number } = {}) {
  await repo.createCompleted({
    providerId: PROVIDER_ID,
    branchId: BRANCH_ID,
    paymentMethodId: PM_ID,
    creatorId: "user-1",
    notes: null,
    items: [{ productId: PRODUCT_ID, quantity: 10, unitCost: over.unitCost ?? 100, discountPct: null }],
    purchasedAt: over.purchasedAt ?? new Date("2026-06-10T00:00:00.000Z"),
  });
}

const req = (over = {}) => ({
  branchId: null, providerId: null, status: null, from: null, to: null,
  page: 1, pageSize: 20, forExport: false, generatedBy: GEN, ...over,
});

describe("GetPurchasesReportUseCase", () => {
  it("sin filtros → lista todas las compras con proveedor y sucursal resueltos", async () => {
    const repo = makeRepo();
    await seedPurchase(repo);

    const { dto, tooLarge } = await new GetPurchasesReportUseCase(repo).execute(req());

    expect(tooLarge).toBe(false);
    expect(dto.rows).toHaveLength(1);
    expect(dto.rows[0].providerName).toBe("Proveedor Uno");
    expect(dto.rows[0].branchName).toBe("Matriz");
    expect(dto.rows[0].status).toBe("completed");
    expect(dto.totals.count).toBe(1);
  });

  it("filtra por rango de fechas", async () => {
    const repo = makeRepo();
    await seedPurchase(repo, { purchasedAt: new Date("2026-01-01T00:00:00.000Z") });
    await seedPurchase(repo, { purchasedAt: new Date("2026-06-15T00:00:00.000Z") });

    const { dto } = await new GetPurchasesReportUseCase(repo).execute(
      req({ from: new Date("2026-06-01T00:00:00.000Z"), to: new Date("2026-06-30T00:00:00.000Z") })
    );

    expect(dto.rows).toHaveLength(1);
  });

  it("sin resultados → array vacío", async () => {
    const repo = makeRepo();
    const { dto } = await new GetPurchasesReportUseCase(repo).execute(req({ providerId: "otro" }));
    expect(dto.rows).toHaveLength(0);
    expect(dto.totals.count).toBe(0);
  });

  it("compra de contado → balance 0.0000 (paidAmount === total)", async () => {
    const repo = makeRepo();
    await seedPurchase(repo);

    const { dto } = await new GetPurchasesReportUseCase(repo).execute(req());

    expect(dto.rows[0].paymentStatus).toBe("paid");
    expect(dto.rows[0].balance).toBe("0.0000");
  });

  it("compra a crédito sin abonar → balance === total", async () => {
    const repo = makeRepo();
    repo.seedPaymentMethod({ id: "pm-credit", code: "CR", isCredit: true, isActive: true });
    await repo.createCompleted({
      providerId: PROVIDER_ID,
      branchId: BRANCH_ID,
      paymentMethodId: "pm-credit",
      creatorId: "user-1",
      notes: null,
      items: [{ productId: PRODUCT_ID, quantity: 10, unitCost: 100, discountPct: null }],
      purchasedAt: new Date("2026-06-10T00:00:00.000Z"),
    });

    const { dto } = await new GetPurchasesReportUseCase(repo).execute(req());

    expect(dto.rows[0].paymentStatus).toBe("pending");
    expect(dto.rows[0].total).toBe(dto.rows[0].balance);
  });

  it("compra parcialmente abonada → balance = total - paidAmount", async () => {
    const repo = makeRepo();
    repo.seedPaymentMethod({ id: "pm-credit", code: "CR", isCredit: true, isActive: true });
    const created = await repo.createCompleted({
      providerId: PROVIDER_ID,
      branchId: BRANCH_ID,
      paymentMethodId: "pm-credit",
      creatorId: "user-1",
      notes: null,
      items: [{ productId: PRODUCT_ID, quantity: 10, unitCost: 100, discountPct: null }],
      purchasedAt: new Date("2026-06-10T00:00:00.000Z"),
    });
    // Simula un abono parcial ya registrado sobre la compra (fuera del alcance de este use case).
    const store = (repo as unknown as { purchases: Map<string, { paidAmount: number; paymentStatus: string }> }).purchases;
    const stored = store.get(created.purchase.id)!;
    stored.paidAmount = 400;
    stored.paymentStatus = "partial";

    const { dto } = await new GetPurchasesReportUseCase(repo).execute(req());

    expect(dto.rows[0].paymentStatus).toBe("partial");
    expect(dto.rows[0].paidAmount).toBe("400.0000");
    expect(dto.rows[0].balance).toBe(money(Number(dto.rows[0].total) - 400));
  });
});
