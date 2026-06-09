import { InMemoryPaymentMethodRepository } from "@/modules/payment-methods/infrastructure/repositories/InMemoryPaymentMethodRepository";
import { CreatePaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/CreatePaymentMethodUseCase";
import { PaymentMethodCodeAlreadyInUseError } from "@/modules/payment-methods/domain/errors/PaymentMethodCodeAlreadyInUseError";

describe("CreatePaymentMethodUseCase", () => {
  it("creates a method with minimal data", async () => {
    const useCase = new CreatePaymentMethodUseCase(new InMemoryPaymentMethodRepository());
    const result = await useCase.execute({ code: "CASH", name: "Efectivo" });
    expect(result.code).toBe("CASH");
    expect(result.isActive).toBe(true);
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
  });

  it("creates a method with all fields", async () => {
    const useCase = new CreatePaymentMethodUseCase(new InMemoryPaymentMethodRepository());
    const result = await useCase.execute({ code: "CARD", name: "Tarjeta", description: "Crédito/débito", isActive: false });
    expect(result.description).toBe("Crédito/débito");
    expect(result.isActive).toBe(false);
  });

  it("throws PaymentMethodCodeAlreadyInUseError on duplicate code", async () => {
    const repo = new InMemoryPaymentMethodRepository();
    const useCase = new CreatePaymentMethodUseCase(repo);
    await useCase.execute({ code: "CASH", name: "Efectivo" });
    await expect(useCase.execute({ code: "CASH", name: "Otro" })).rejects.toThrow(PaymentMethodCodeAlreadyInUseError);
  });

  it("creates method with isCredit=true when specified", async () => {
    const useCase = new CreatePaymentMethodUseCase(new InMemoryPaymentMethodRepository());
    const result = await useCase.execute({ code: "CREDITO", name: "Crédito", isCredit: true });
    expect(result.isCredit).toBe(true);
  });

  it("defaults isCredit to false when not specified", async () => {
    const useCase = new CreatePaymentMethodUseCase(new InMemoryPaymentMethodRepository());
    const result = await useCase.execute({ code: "EFECTIVO", name: "Efectivo" });
    expect(result.isCredit).toBe(false);
  });

  it("creates method with isCredit=false when explicitly set", async () => {
    const useCase = new CreatePaymentMethodUseCase(new InMemoryPaymentMethodRepository());
    const result = await useCase.execute({ code: "TDD", name: "Tarjeta", isCredit: false });
    expect(result.isCredit).toBe(false);
  });
});
