import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaBranchRepository } from "@/modules/branches/infrastructure/repositories/PrismaBranchRepository";
import { ListBranchesUseCase } from "@/modules/branches/application/use-cases/ListBranchesUseCase";
import { GetBranchUseCase } from "@/modules/branches/application/use-cases/GetBranchUseCase";
import { CreateBranchUseCase } from "@/modules/branches/application/use-cases/CreateBranchUseCase";
import { UpdateBranchUseCase } from "@/modules/branches/application/use-cases/UpdateBranchUseCase";
import { SoftDeleteBranchUseCase } from "@/modules/branches/application/use-cases/SoftDeleteBranchUseCase";
import { BranchesController } from "@/modules/branches/infrastructure/http/BranchesController";

const repo = new PrismaBranchRepository(prisma);

export const branchRepo = repo;

export const branchesController = new BranchesController(
  new ListBranchesUseCase(repo),
  new GetBranchUseCase(repo),
  new CreateBranchUseCase(repo),
  new UpdateBranchUseCase(repo),
  new SoftDeleteBranchUseCase(repo)
);
