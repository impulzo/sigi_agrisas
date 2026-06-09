import { ListReturnsBySaleUseCase } from "@/modules/returns/application/use-cases/ListReturnsBySaleUseCase";
import { InMemoryReturnRepository } from "@/modules/returns/infrastructure/repositories/InMemoryReturnRepository";
import { Return } from "@/modules/returns/domain/entities/Return";

function makeReturn(id: string, saleId: string, status: "completed" | "cancelled", returnedAt: Date): Return {
  return Return.create({
    id,
    saleId,
    branchId: "branch-1",
    customerId: null,
    creatorId: "00000000-0000-0000-0000-000000000001",
    status,
    reason: "Test",
    returnedAt,
    notes: null,
    cancelledAt: status === "cancelled" ? returnedAt : null,
    cancelledBy: status === "cancelled" ? "00000000-0000-0000-0000-000000000001" : null,
    cancellationReason: null,
  });
}

describe("ListReturnsBySaleUseCase", () => {
  let returnRepo: InMemoryReturnRepository;
  let useCase: ListReturnsBySaleUseCase;

  beforeEach(() => {
    returnRepo = new InMemoryReturnRepository();
    useCase = new ListReturnsBySaleUseCase(returnRepo);
  });

  it("returns empty array when sale has no returns", async () => {
    const result = await useCase.execute("sale-none");
    expect(result).toEqual([]);
  });

  it("returns both completed and cancelled returns for a sale", async () => {
    const d1 = new Date("2026-06-02");
    const d2 = new Date("2026-06-01");
    returnRepo.seed(makeReturn("r-1", "sale-1", "completed", d1));
    returnRepo.seed(makeReturn("r-2", "sale-1", "cancelled", d2));

    const result = await useCase.execute("sale-1");
    expect(result).toHaveLength(2);
    const statuses = result.map((r) => r.status);
    expect(statuses).toContain("completed");
    expect(statuses).toContain("cancelled");
  });

  it("orders results by returnedAt DESC", async () => {
    const d1 = new Date("2026-06-01");
    const d2 = new Date("2026-06-02");
    returnRepo.seed(makeReturn("r-1", "sale-1", "completed", d1));
    returnRepo.seed(makeReturn("r-2", "sale-1", "completed", d2));

    const result = await useCase.execute("sale-1");
    expect(result[0].returnedAt).toBe(d2.toISOString());
    expect(result[1].returnedAt).toBe(d1.toISOString());
  });

  it("does not include returns from other sales", async () => {
    returnRepo.seed(makeReturn("r-1", "sale-1", "completed", new Date()));
    returnRepo.seed(makeReturn("r-2", "sale-2", "completed", new Date()));

    const result = await useCase.execute("sale-1");
    expect(result).toHaveLength(1);
  });
});
