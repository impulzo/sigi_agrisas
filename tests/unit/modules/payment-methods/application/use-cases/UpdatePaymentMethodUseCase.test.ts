import { InMemoryPaymentMethodRepository } from "@/modules/payment-methods/infrastructure/repositories/InMemoryPaymentMethodRepository";
import { CreatePaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/CreatePaymentMethodUseCase";
import { UpdatePaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/UpdatePaymentMethodUseCase";
import { PaymentMethodNotFoundError } from "@/modules/payment-methods/domain/errors/PaymentMethodNotFoundError";

describe("UpdatePaymentMethodUseCase", () => {
  it("updates name", async () => {
    const repo = new InMemoryPaymentMethodRepository();
    const created = await new CreatePaymentMethodUseCase(repo).execute({ code: "CASH", name: "Efectivo" });
    const result = await new UpdatePaymentMethodUseCase(repo).execute({ id: created.id, name: "Efectivo en caja" });
    expect(result.name).toBe("Efectivo en caja");
    expect(result.code).toBe("CASH");
  });

  it("clears description with null", async () => {
    const repo = new InMemoryPaymentMethodRepository();
    const created = await new CreatePaymentMethodUseCase(repo).execute({ code: "CASH", name: "Efectivo", description: "Desc" });
    const result = await new UpdatePaymentMethodUseCase(repo).execute({ id: created.id, description: null });
    expect(result.description).toBeNull();
  });

  it("does not update code (code stays the same)", async () => {
    const repo = new InMemoryPaymentMethodRepository();
    const created = await new CreatePaymentMethodUseCase(repo).execute({ code: "CASH", name: "Efectivo" });
    const result = await new UpdatePaymentMethodUseCase(repo).execute({ id: created.id, name: "Nuevo" });
    expect(result.code).toBe("CASH");
  });

  it("throws PaymentMethodNotFoundError on missing id", async () => {
    const useCase = new UpdatePaymentMethodUseCase(new InMemoryPaymentMethodRepository());
    await expect(useCase.execute({ id: "ghost", name: "X" })).rejects.toThrow(PaymentMethodNotFoundError);
  });

  it("isCredit is immutable — updating other fields does not change it", async () => {
    const repo = new InMemoryPaymentMethodRepository();
    const created = await new CreatePaymentMethodUseCase(repo).execute({ code: "CREDITO", name: "Crédito", isCredit: true });
    // PATCH only accepts name/description/isActive — isCredit is not in UpdatePaymentMethodData
    const result = await new UpdatePaymentMethodUseCase(repo).execute({ id: created.id, name: "Crédito v2" });
    expect(result.isCredit).toBe(true);
    expect(result.name).toBe("Crédito v2");
  });
});
