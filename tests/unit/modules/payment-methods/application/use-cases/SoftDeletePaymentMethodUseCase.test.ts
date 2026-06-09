import { InMemoryPaymentMethodRepository } from "@/modules/payment-methods/infrastructure/repositories/InMemoryPaymentMethodRepository";
import { CreatePaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/CreatePaymentMethodUseCase";
import { SoftDeletePaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/SoftDeletePaymentMethodUseCase";
import { GetPaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/GetPaymentMethodUseCase";
import { PaymentMethodNotFoundError } from "@/modules/payment-methods/domain/errors/PaymentMethodNotFoundError";

describe("SoftDeletePaymentMethodUseCase", () => {
  it("marks active method as inactive", async () => {
    const repo = new InMemoryPaymentMethodRepository();
    const created = await new CreatePaymentMethodUseCase(repo).execute({ code: "CASH", name: "Efectivo" });
    await new SoftDeletePaymentMethodUseCase(repo).execute(created.id);
    const found = await new GetPaymentMethodUseCase(repo).execute(created.id);
    expect(found.isActive).toBe(false);
  });

  it("is idempotent on already inactive method", async () => {
    const repo = new InMemoryPaymentMethodRepository();
    const created = await new CreatePaymentMethodUseCase(repo).execute({ code: "CASH", name: "Efectivo", isActive: false });
    await expect(new SoftDeletePaymentMethodUseCase(repo).execute(created.id)).resolves.toBeUndefined();
  });

  it("throws PaymentMethodNotFoundError for unknown id", async () => {
    await expect(
      new SoftDeletePaymentMethodUseCase(new InMemoryPaymentMethodRepository()).execute("ghost")
    ).rejects.toThrow(PaymentMethodNotFoundError);
  });
});
