import { InMemoryPaymentMethodRepository } from "@/modules/payment-methods/infrastructure/repositories/InMemoryPaymentMethodRepository";
import { ListPaymentMethodsUseCase } from "@/modules/payment-methods/application/use-cases/ListPaymentMethodsUseCase";
import { PaymentMethod } from "@/modules/payment-methods/domain/entities/PaymentMethod";

function makeMethod(id: string, code: string, isActive = true): PaymentMethod {
  const now = new Date();
  return PaymentMethod.create(id, { code, name: `Method ${code}`, description: null, isCredit: false, isActive, createdAt: now, updatedAt: now });
}

describe("ListPaymentMethodsUseCase", () => {
  it("returns only active methods by default", async () => {
    const repo = new InMemoryPaymentMethodRepository();
    repo.seed([makeMethod("1", "CASH", true), makeMethod("2", "CARD", false)]);
    const useCase = new ListPaymentMethodsUseCase(repo);
    const result = await useCase.execute({ page: 1, pageSize: 20, includeInactive: false });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].code).toBe("CASH");
    expect(result.total).toBe(1);
  });

  it("returns all methods when includeInactive=true", async () => {
    const repo = new InMemoryPaymentMethodRepository();
    repo.seed([makeMethod("1", "CASH", true), makeMethod("2", "CARD", false)]);
    const useCase = new ListPaymentMethodsUseCase(repo);
    const result = await useCase.execute({ page: 1, pageSize: 20, includeInactive: true });
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("paginates results", async () => {
    const repo = new InMemoryPaymentMethodRepository();
    repo.seed([makeMethod("1", "A"), makeMethod("2", "B"), makeMethod("3", "C")]);
    const useCase = new ListPaymentMethodsUseCase(repo);
    const result = await useCase.execute({ page: 1, pageSize: 2, includeInactive: false });
    expect(result.items).toHaveLength(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(2);
    expect(result.total).toBe(3);
  });

  it("returns second page", async () => {
    const repo = new InMemoryPaymentMethodRepository();
    repo.seed([makeMethod("1", "A"), makeMethod("2", "B"), makeMethod("3", "C")]);
    const useCase = new ListPaymentMethodsUseCase(repo);
    const result = await useCase.execute({ page: 2, pageSize: 2, includeInactive: false });
    expect(result.items).toHaveLength(1);
  });
});
