import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaPaymentMethodRepository } from "@/modules/payment-methods/infrastructure/repositories/PrismaPaymentMethodRepository";
import { ListPaymentMethodsUseCase } from "@/modules/payment-methods/application/use-cases/ListPaymentMethodsUseCase";
import { GetPaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/GetPaymentMethodUseCase";
import { CreatePaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/CreatePaymentMethodUseCase";
import { UpdatePaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/UpdatePaymentMethodUseCase";
import { SoftDeletePaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/SoftDeletePaymentMethodUseCase";
import { PaymentMethodsController } from "@/modules/payment-methods/infrastructure/http/PaymentMethodsController";

const repo = new PrismaPaymentMethodRepository(prisma);

export const paymentMethodsController = new PaymentMethodsController(
  new ListPaymentMethodsUseCase(repo),
  new GetPaymentMethodUseCase(repo),
  new CreatePaymentMethodUseCase(repo),
  new UpdatePaymentMethodUseCase(repo),
  new SoftDeletePaymentMethodUseCase(repo)
);
