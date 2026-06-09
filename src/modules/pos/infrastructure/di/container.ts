import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaSaleRepository } from "@/modules/pos/infrastructure/repositories/PrismaSaleRepository";
import { PrismaPosLookupService } from "@/modules/pos/infrastructure/repositories/PrismaPosLookupService";
import { PrismaQuoteRepository } from "@/modules/quotes/infrastructure/repositories/PrismaQuoteRepository";
import { ListSalesUseCase } from "@/modules/pos/application/use-cases/ListSalesUseCase";
import { GetSaleUseCase } from "@/modules/pos/application/use-cases/GetSaleUseCase";
import { CreateSaleUseCase } from "@/modules/pos/application/use-cases/CreateSaleUseCase";
import { CancelSaleUseCase } from "@/modules/pos/application/use-cases/CancelSaleUseCase";
import { EditCompletedSaleUseCase } from "@/modules/pos/application/use-cases/EditCompletedSaleUseCase";
import { SalesController } from "@/modules/pos/infrastructure/http/SalesController";
import { branchRepo } from "@/modules/branches/infrastructure/di/container";
import { rbacContainer } from "@/modules/rbac/infrastructure/di/container";

const saleRepo = new PrismaSaleRepository(prisma);
const lookups = new PrismaPosLookupService(prisma);
// Local quote repo to validate `quoteId` when `POST /sales` includes one.
// Instantiated here (not imported from quotes/di) to avoid a circular module dependency.
const quoteRepo = new PrismaQuoteRepository(prisma);

const listUseCase = new ListSalesUseCase(saleRepo);
const getUseCase = new GetSaleUseCase(saleRepo);
const createUseCase = new CreateSaleUseCase(saleRepo, lookups, quoteRepo);
const cancelUseCase = new CancelSaleUseCase(saleRepo);
const editUseCase = new EditCompletedSaleUseCase(saleRepo, lookups);

export const salesController = new SalesController(
  listUseCase,
  getUseCase,
  createUseCase,
  cancelUseCase,
  editUseCase,
  branchRepo,
  lookups,
  rbacContainer.authorizationService
);
