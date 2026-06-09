import { ListReturnsUseCase } from "@/modules/returns/application/use-cases/ListReturnsUseCase";
import { InMemoryReturnRepository } from "@/modules/returns/infrastructure/repositories/InMemoryReturnRepository";
import { Return } from "@/modules/returns/domain/entities/Return";

function makeReturn(overrides: { id: string; branchId?: string; customerId?: string; saleId?: string; status?: "completed" | "cancelled"; returnedAt?: Date }): Return {
  return Return.create({
    id: overrides.id,
    saleId: overrides.saleId ?? "sale-1",
    branchId: overrides.branchId ?? "branch-1",
    customerId: overrides.customerId ?? null,
    creatorId: "00000000-0000-0000-0000-000000000001",
    status: overrides.status ?? "completed",
    reason: "Test reason",
    returnedAt: overrides.returnedAt ?? new Date("2026-06-01"),
    notes: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
  });
}

describe("ListReturnsUseCase", () => {
  let returnRepo: InMemoryReturnRepository;
  let useCase: ListReturnsUseCase;

  beforeEach(() => {
    returnRepo = new InMemoryReturnRepository();
    useCase = new ListReturnsUseCase(returnRepo);
  });

  it("paginates results", async () => {
    for (let i = 1; i <= 5; i++) {
      returnRepo.seed(makeReturn({ id: `r-${i}` }));
    }

    const result = await useCase.execute({ page: 1, pageSize: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(5);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(3);
  });

  it("filters by branchId", async () => {
    returnRepo.seed(makeReturn({ id: "r-1", branchId: "branch-A" }));
    returnRepo.seed(makeReturn({ id: "r-2", branchId: "branch-B" }));

    const result = await useCase.execute({ page: 1, pageSize: 20, branchId: "branch-A" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].branchId).toBe("branch-A");
  });

  it("filters by status", async () => {
    returnRepo.seed(makeReturn({ id: "r-1", status: "completed" }));
    returnRepo.seed(makeReturn({ id: "r-2", status: "cancelled" }));

    const result = await useCase.execute({ page: 1, pageSize: 20, statuses: ["cancelled"] });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].status).toBe("cancelled");
  });

  it("filters by saleId", async () => {
    returnRepo.seed(makeReturn({ id: "r-1", saleId: "sale-A" }));
    returnRepo.seed(makeReturn({ id: "r-2", saleId: "sale-B" }));

    const result = await useCase.execute({ page: 1, pageSize: 20, saleId: "sale-A" });
    expect(result.items).toHaveLength(1);
  });

  it("filters by date range", async () => {
    returnRepo.seed(makeReturn({ id: "r-1", returnedAt: new Date("2026-05-01") }));
    returnRepo.seed(makeReturn({ id: "r-2", returnedAt: new Date("2026-06-01") }));

    const result = await useCase.execute({
      page: 1,
      pageSize: 20,
      from: new Date("2026-06-01"),
    });
    expect(result.items).toHaveLength(1);
  });

  it("returns empty when no results", async () => {
    const result = await useCase.execute({ page: 1, pageSize: 20 });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
