import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaAdminUserRepository } from "@/modules/users/infrastructure/repositories/PrismaAdminUserRepository";
import { ListUsersUseCase } from "@/modules/users/application/use-cases/ListUsersUseCase";
import { GetUserUseCase } from "@/modules/users/application/use-cases/GetUserUseCase";
import { UpdateUserUseCase } from "@/modules/users/application/use-cases/UpdateUserUseCase";
import { DeleteUserUseCase } from "@/modules/users/application/use-cases/DeleteUserUseCase";
import { UsersController } from "@/modules/users/infrastructure/http/UsersController";
import { branchRepo } from "@/modules/branches/infrastructure/di/container";

const adminUserRepo = new PrismaAdminUserRepository(prisma);

const listUsersUseCase = new ListUsersUseCase(adminUserRepo);
const getUserUseCase = new GetUserUseCase(adminUserRepo);
const updateUserUseCase = new UpdateUserUseCase(adminUserRepo, branchRepo);
const deleteUserUseCase = new DeleteUserUseCase(adminUserRepo);

export const usersController = new UsersController(
  listUsersUseCase,
  getUserUseCase,
  updateUserUseCase,
  deleteUserUseCase
);
