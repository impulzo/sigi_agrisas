import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaQuoteRepository } from "@/modules/quotes/infrastructure/repositories/PrismaQuoteRepository";
import { PrismaSaleRepository } from "@/modules/pos/infrastructure/repositories/PrismaSaleRepository";
import { PrismaPosLookupService } from "@/modules/pos/infrastructure/repositories/PrismaPosLookupService";
import { ListQuotesUseCase } from "@/modules/quotes/application/use-cases/ListQuotesUseCase";
import { GetQuoteUseCase } from "@/modules/quotes/application/use-cases/GetQuoteUseCase";
import { CreateQuoteUseCase } from "@/modules/quotes/application/use-cases/CreateQuoteUseCase";
import { UpdateQuoteUseCase } from "@/modules/quotes/application/use-cases/UpdateQuoteUseCase";
import { AuthorizeQuoteUseCase } from "@/modules/quotes/application/use-cases/AuthorizeQuoteUseCase";
import { CancelQuoteUseCase } from "@/modules/quotes/application/use-cases/CancelQuoteUseCase";
import { ConvertQuoteToSaleUseCase } from "@/modules/quotes/application/use-cases/ConvertQuoteToSaleUseCase";
import { QuotesController } from "@/modules/quotes/infrastructure/http/QuotesController";
import { rbacContainer } from "@/modules/rbac/infrastructure/di/container";

// Local instances — we do NOT import the pos `salesController`/`saleRepo` from
// pos/di to avoid a circular import (pos container also needs to know about
// quoteRepo for the quoteId-on-POST-/sales validation path). Both modules
// instantiate their own thin wrappers around the shared `prisma` singleton;
// the resulting state is identical because they all delegate to the same DB.
export const quoteRepo = new PrismaQuoteRepository(prisma);
const saleRepo = new PrismaSaleRepository(prisma);
const lookups = new PrismaPosLookupService(prisma);

const listUseCase = new ListQuotesUseCase(quoteRepo);
const getUseCase = new GetQuoteUseCase(quoteRepo);
const createUseCase = new CreateQuoteUseCase(quoteRepo, lookups);
const updateUseCase = new UpdateQuoteUseCase(quoteRepo, lookups);
const authorizeUseCase = new AuthorizeQuoteUseCase(quoteRepo);
const cancelUseCase = new CancelQuoteUseCase(quoteRepo);
const convertUseCase = new ConvertQuoteToSaleUseCase(quoteRepo, saleRepo, lookups);

export const quotesController = new QuotesController(
  listUseCase,
  getUseCase,
  createUseCase,
  updateUseCase,
  authorizeUseCase,
  cancelUseCase,
  convertUseCase,
  rbacContainer.authorizationService
);
