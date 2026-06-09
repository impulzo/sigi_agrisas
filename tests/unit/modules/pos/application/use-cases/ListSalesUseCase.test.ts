import { ListSalesUseCase } from "@/modules/pos/application/use-cases/ListSalesUseCase";
import { InMemorySaleRepository } from "@/modules/pos/infrastructure/repositories/InMemorySaleRepository";

function makeUseCase() {
  const repo = new InMemorySaleRepository();
  const useCase = new ListSalesUseCase(repo);
  return { repo, useCase };
}

describe("ListSalesUseCase", () => {
  it("devuelve lista vacía cuando no hay ventas", async () => {
    const { useCase } = makeUseCase();
    const result = await useCase.execute({ page: 1, pageSize: 20 });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("aplica paginación correctamente", async () => {
    const { repo, useCase } = makeUseCase();
    await repo.createCompleted({
      branchId: "b1", customerId: "c1", cashierId: "u1",
      paymentMethodId: "pm1", folioId: "f1", notes: null,
      paidAmount: 116, paymentStatus: "paid",
      subtotal: 100, taxTotal: 16, total: 116, items: [],
    });
    await repo.createCompleted({
      branchId: "b1", customerId: "c1", cashierId: "u1",
      paymentMethodId: "pm1", folioId: "f1", notes: null,
      paidAmount: 232, paymentStatus: "paid",
      subtotal: 200, taxTotal: 32, total: 232, items: [],
    });
    await repo.createCompleted({
      branchId: "b1", customerId: "c1", cashierId: "u1",
      paymentMethodId: "pm1", folioId: "f1", notes: null,
      paidAmount: 58, paymentStatus: "paid",
      subtotal: 50, taxTotal: 8, total: 58, items: [],
    });

    const page1 = await useCase.execute({ page: 1, pageSize: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(3);

    const page2 = await useCase.execute({ page: 2, pageSize: 2 });
    expect(page2.items).toHaveLength(1);
  });

  it("filtra por branchId", async () => {
    const { repo, useCase } = makeUseCase();
    await repo.createCompleted({
      branchId: "branch-A", customerId: "c1", cashierId: "u1",
      paymentMethodId: "pm1", folioId: "f1", notes: null,
      paidAmount: 116, paymentStatus: "paid",
      subtotal: 100, taxTotal: 16, total: 116, items: [],
    });
    await repo.createCompleted({
      branchId: "branch-B", customerId: "c1", cashierId: "u1",
      paymentMethodId: "pm1", folioId: "f1", notes: null,
      paidAmount: 232, paymentStatus: "paid",
      subtotal: 200, taxTotal: 32, total: 232, items: [],
    });

    const result = await useCase.execute({ page: 1, pageSize: 20, branchId: "branch-A" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].branchId).toBe("branch-A");
  });

  it("filtra por múltiples status (completed + edited)", async () => {
    const { repo, useCase } = makeUseCase();
    const sale1 = await repo.createCompleted({
      branchId: "b1", customerId: "c1", cashierId: "u1",
      paymentMethodId: "pm1", folioId: "f1", notes: null,
      paidAmount: 116, paymentStatus: "paid",
      subtotal: 100, taxTotal: 16, total: 116, items: [],
    });
    const sale2 = await repo.createCompleted({
      branchId: "b1", customerId: "c1", cashierId: "u1",
      paymentMethodId: "pm1", folioId: "f1", notes: null,
      paidAmount: 232, paymentStatus: "paid",
      subtotal: 200, taxTotal: 32, total: 232, items: [],
    });
    await repo.cancel(sale2.sale.id, null);

    const result = await useCase.execute({
      page: 1, pageSize: 20,
      statuses: ["completed", "edited"],
    });
    expect(result.total).toBe(1);
    expect(result.items[0].status).toBe("completed");
    expect(result.items.some((s) => s.status === "cancelled")).toBe(false);
  });

  it("filtra por rango de fechas (from / to)", async () => {
    const { repo, useCase } = makeUseCase();
    await repo.createCompleted({
      branchId: "b1", customerId: "c1", cashierId: "u1",
      paymentMethodId: "pm1", folioId: "f1", notes: null,
      paidAmount: 116, paymentStatus: "paid",
      subtotal: 100, taxTotal: 16, total: 116, items: [],
    });

    const past = new Date("2020-01-01");
    const futureFrom = new Date("2099-01-01");

    const none = await useCase.execute({ page: 1, pageSize: 20, from: futureFrom });
    expect(none.total).toBe(0);

    const all = await useCase.execute({ page: 1, pageSize: 20, from: past });
    expect(all.total).toBe(1);
  });

  it("filtra por customerId", async () => {
    const { repo, useCase } = makeUseCase();
    await repo.createCompleted({
      branchId: "b1", customerId: "customer-X", cashierId: "u1",
      paymentMethodId: "pm1", folioId: "f1", notes: null,
      paidAmount: 116, paymentStatus: "paid",
      subtotal: 100, taxTotal: 16, total: 116, items: [],
    });
    await repo.createCompleted({
      branchId: "b1", customerId: "customer-Y", cashierId: "u1",
      paymentMethodId: "pm1", folioId: "f1", notes: null,
      paidAmount: 232, paymentStatus: "paid",
      subtotal: 200, taxTotal: 32, total: 232, items: [],
    });

    const result = await useCase.execute({ page: 1, pageSize: 20, customerId: "customer-X" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].customerId).toBe("customer-X");
  });
});
