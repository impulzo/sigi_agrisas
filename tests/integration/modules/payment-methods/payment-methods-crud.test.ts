import { PrismaPaymentMethodRepository } from "@/modules/payment-methods/infrastructure/repositories/PrismaPaymentMethodRepository";
import { CreatePaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/CreatePaymentMethodUseCase";
import { GetPaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/GetPaymentMethodUseCase";
import { ListPaymentMethodsUseCase } from "@/modules/payment-methods/application/use-cases/ListPaymentMethodsUseCase";
import { UpdatePaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/UpdatePaymentMethodUseCase";
import { SoftDeletePaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/SoftDeletePaymentMethodUseCase";
import { prisma } from "@/shared/infrastructure/prisma/client";

const CODE = `TEST_PM_${Date.now()}`;

afterAll(async () => {
  await prisma.paymentMethod.deleteMany({ where: { code: { startsWith: "TEST_PM_" } } });
  await prisma.$disconnect();
});

describe("PaymentMethod CRUD integration", () => {
  const repo = new PrismaPaymentMethodRepository(prisma);
  const createUC = new CreatePaymentMethodUseCase(repo);
  const getUC = new GetPaymentMethodUseCase(repo);
  const listUC = new ListPaymentMethodsUseCase(repo);
  const updateUC = new UpdatePaymentMethodUseCase(repo);
  const softDeleteUC = new SoftDeletePaymentMethodUseCase(repo);

  let createdId: string;

  it("creates a payment method", async () => {
    const result = await createUC.execute({ code: CODE, name: "Test Method" });
    expect(result.id).toBeDefined();
    expect(result.code).toBe(CODE);
    expect(result.isActive).toBe(true);
    createdId = result.id;
  });

  it("gets by id", async () => {
    const result = await getUC.execute(createdId);
    expect(result.code).toBe(CODE);
  });

  it("appears in list", async () => {
    const result = await listUC.execute({ page: 1, pageSize: 100, includeInactive: false });
    expect(result.items.some((m) => m.id === createdId)).toBe(true);
  });

  it("updates name", async () => {
    const result = await updateUC.execute({ id: createdId, name: "Updated Name" });
    expect(result.name).toBe("Updated Name");
  });

  it("soft-deletes: hidden from default list", async () => {
    await softDeleteUC.execute(createdId);
    const result = await listUC.execute({ page: 1, pageSize: 100, includeInactive: false });
    expect(result.items.some((m) => m.id === createdId)).toBe(false);
  });

  it("soft-deleted item visible with includeInactive=true", async () => {
    const result = await listUC.execute({ page: 1, pageSize: 100, includeInactive: true });
    expect(result.items.some((m) => m.id === createdId)).toBe(true);
  });

  it("can reactivate via update", async () => {
    const result = await updateUC.execute({ id: createdId, isActive: true });
    expect(result.isActive).toBe(true);
  });
});
