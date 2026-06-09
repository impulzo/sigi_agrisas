import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaReturnRepository } from "@/modules/returns/infrastructure/repositories/PrismaReturnRepository";
import { ListReturnsUseCase } from "@/modules/returns/application/use-cases/ListReturnsUseCase";
import { GetReturnUseCase } from "@/modules/returns/application/use-cases/GetReturnUseCase";
import { ListReturnsBySaleUseCase } from "@/modules/returns/application/use-cases/ListReturnsBySaleUseCase";
import { CreateReturnUseCase } from "@/modules/returns/application/use-cases/CreateReturnUseCase";
import { CancelReturnUseCase } from "@/modules/returns/application/use-cases/CancelReturnUseCase";
import { ReturnsController } from "@/modules/returns/infrastructure/http/ReturnsController";
import { rbacContainer } from "@/modules/rbac/infrastructure/di/container";
// Import only the repo from pos/di to avoid coupling the full pos container
import { PrismaSaleRepository } from "@/modules/pos/infrastructure/repositories/PrismaSaleRepository";

const returnRepo = new PrismaReturnRepository(prisma);
const saleRepo = new PrismaSaleRepository(prisma);

const listUseCase = new ListReturnsUseCase(returnRepo);
const getUseCase = new GetReturnUseCase(returnRepo);
const listBySaleUseCase = new ListReturnsBySaleUseCase(returnRepo);
const createUseCase = new CreateReturnUseCase(returnRepo, saleRepo);
const cancelUseCase = new CancelReturnUseCase(returnRepo);

export const returnsController = new ReturnsController(
  listUseCase,
  getUseCase,
  listBySaleUseCase,
  createUseCase,
  cancelUseCase,
  saleRepo,
  rbacContainer.authorizationService
);
