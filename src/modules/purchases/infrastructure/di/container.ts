import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaPurchaseRepository } from "@/modules/purchases/infrastructure/repositories/PrismaPurchaseRepository";
import { PrismaProviderPaymentRepository } from "@/modules/purchases/infrastructure/repositories/PrismaProviderPaymentRepository";
import { ListPurchasesUseCase } from "@/modules/purchases/application/use-cases/ListPurchasesUseCase";
import { GetPurchaseUseCase } from "@/modules/purchases/application/use-cases/GetPurchaseUseCase";
import { CreatePurchaseUseCase } from "@/modules/purchases/application/use-cases/CreatePurchaseUseCase";
import { CancelPurchaseUseCase } from "@/modules/purchases/application/use-cases/CancelPurchaseUseCase";
import { RegisterProviderPaymentUseCase } from "@/modules/purchases/application/use-cases/RegisterProviderPaymentUseCase";
import { CancelProviderPaymentUseCase } from "@/modules/purchases/application/use-cases/CancelProviderPaymentUseCase";
import { GetProviderPaymentUseCase } from "@/modules/purchases/application/use-cases/GetProviderPaymentUseCase";
import { ListProviderPaymentsByPurchaseUseCase } from "@/modules/purchases/application/use-cases/ListProviderPaymentsByPurchaseUseCase";
import { PurchasesController } from "@/modules/purchases/infrastructure/http/PurchasesController";
import { rbacContainer } from "@/modules/rbac/infrastructure/di/container";

const purchaseRepo = new PrismaPurchaseRepository(prisma);
const providerPaymentRepo = new PrismaProviderPaymentRepository(prisma);

const listUseCase = new ListPurchasesUseCase(purchaseRepo);
const getUseCase = new GetPurchaseUseCase(purchaseRepo);
const createUseCase = new CreatePurchaseUseCase(purchaseRepo);
const cancelUseCase = new CancelPurchaseUseCase(purchaseRepo);
const registerProviderPaymentUseCase = new RegisterProviderPaymentUseCase(providerPaymentRepo);
const cancelProviderPaymentUseCase = new CancelProviderPaymentUseCase(providerPaymentRepo);
const getProviderPaymentUseCase = new GetProviderPaymentUseCase(providerPaymentRepo);
const listProviderPaymentsByPurchaseUseCase = new ListProviderPaymentsByPurchaseUseCase(providerPaymentRepo);

export const purchasesController = new PurchasesController(
  listUseCase,
  getUseCase,
  createUseCase,
  cancelUseCase,
  registerProviderPaymentUseCase,
  cancelProviderPaymentUseCase,
  getProviderPaymentUseCase,
  listProviderPaymentsByPurchaseUseCase,
  rbacContainer.authorizationService
);
