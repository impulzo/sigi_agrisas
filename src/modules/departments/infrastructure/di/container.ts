import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaDepartmentRepository } from "@/modules/departments/infrastructure/repositories/PrismaDepartmentRepository";
import { PrismaProviderRepository } from "@/modules/providers/infrastructure/repositories/PrismaProviderRepository";
import { ListDepartmentsUseCase } from "@/modules/departments/application/use-cases/ListDepartmentsUseCase";
import { GetDepartmentUseCase } from "@/modules/departments/application/use-cases/GetDepartmentUseCase";
import { CreateDepartmentUseCase } from "@/modules/departments/application/use-cases/CreateDepartmentUseCase";
import { UpdateDepartmentUseCase } from "@/modules/departments/application/use-cases/UpdateDepartmentUseCase";
import { SoftDeleteDepartmentUseCase } from "@/modules/departments/application/use-cases/SoftDeleteDepartmentUseCase";
import { DepartmentsController } from "@/modules/departments/infrastructure/http/DepartmentsController";

const repo = new PrismaDepartmentRepository(prisma);
const providerRepo = new PrismaProviderRepository(prisma);

export const departmentsController = new DepartmentsController(
  new ListDepartmentsUseCase(repo),
  new GetDepartmentUseCase(repo),
  new CreateDepartmentUseCase(repo, providerRepo),
  new UpdateDepartmentUseCase(repo, providerRepo),
  new SoftDeleteDepartmentUseCase(repo)
);
