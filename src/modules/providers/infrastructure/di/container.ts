import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaProviderRepository } from "@/modules/providers/infrastructure/repositories/PrismaProviderRepository";
import { ListProvidersUseCase } from "@/modules/providers/application/use-cases/ListProvidersUseCase";
import { GetProviderUseCase } from "@/modules/providers/application/use-cases/GetProviderUseCase";
import { CreateProviderUseCase } from "@/modules/providers/application/use-cases/CreateProviderUseCase";
import { UpdateProviderUseCase } from "@/modules/providers/application/use-cases/UpdateProviderUseCase";
import { SoftDeleteProviderUseCase } from "@/modules/providers/application/use-cases/SoftDeleteProviderUseCase";
import { ProviderController } from "@/modules/providers/infrastructure/http/ProviderController";

const providerRepo = new PrismaProviderRepository(prisma);

const listProvidersUseCase = new ListProvidersUseCase(providerRepo);
const getProviderUseCase = new GetProviderUseCase(providerRepo);
const createProviderUseCase = new CreateProviderUseCase(providerRepo);
const updateProviderUseCase = new UpdateProviderUseCase(providerRepo);
const softDeleteProviderUseCase = new SoftDeleteProviderUseCase(providerRepo);

export const providersController = new ProviderController(
  listProvidersUseCase,
  getProviderUseCase,
  createProviderUseCase,
  updateProviderUseCase,
  softDeleteProviderUseCase
);
