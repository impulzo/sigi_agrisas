import { InMemoryPaymentMethodRepository } from "@/modules/payment-methods/infrastructure/repositories/InMemoryPaymentMethodRepository";
import { GetPaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/GetPaymentMethodUseCase";
import { PaymentMethod } from "@/modules/payment-methods/domain/entities/PaymentMethod";
import { PaymentMethodNotFoundError } from "@/modules/payment-methods/domain/errors/PaymentMethodNotFoundError";

describe("GetPaymentMethodUseCase", () => {
  it("returns a method by id", async () => {
    const repo = new InMemoryPaymentMethodRepository();
    const now = new Date();
    repo.seed([PaymentMethod.create("abc", { code: "CASH", name: "Efectivo", description: null, isCredit: false, isActive: true, createdAt: now, updatedAt: now })]);
    const useCase = new GetPaymentMethodUseCase(repo);
    const result = await useCase.execute("abc");
    expect(result.id).toBe("abc");
    expect(result.code).toBe("CASH");
  });

  it("throws PaymentMethodNotFoundError when not found", async () => {
    const repo = new InMemoryPaymentMethodRepository();
    const useCase = new GetPaymentMethodUseCase(repo);
    await expect(useCase.execute("nonexistent")).rejects.toThrow(PaymentMethodNotFoundError);
  });
});
