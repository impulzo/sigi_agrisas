import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaAdminUserRepository } from "@/modules/users/infrastructure/repositories/PrismaAdminUserRepository";
import { ListUsersUseCase } from "@/modules/users/application/use-cases/ListUsersUseCase";
import { GetUserUseCase } from "@/modules/users/application/use-cases/GetUserUseCase";
import { CreateAdminUserUseCase } from "@/modules/users/application/use-cases/CreateAdminUserUseCase";
import { UpdateUserUseCase } from "@/modules/users/application/use-cases/UpdateUserUseCase";
import { DeleteUserUseCase } from "@/modules/users/application/use-cases/DeleteUserUseCase";
import { UsersController } from "@/modules/users/infrastructure/http/UsersController";
import { branchRepo } from "@/modules/branches/infrastructure/di/container";
import { BcryptPasswordHasher } from "@/modules/auth/infrastructure/services/BcryptPasswordHasher";

const adminUserRepo = new PrismaAdminUserRepository(prisma);
const passwordHasher = new BcryptPasswordHasher();

const listUsersUseCase = new ListUsersUseCase(adminUserRepo);
const getUserUseCase = new GetUserUseCase(adminUserRepo);
const createUserUseCase = new CreateAdminUserUseCase(adminUserRepo, branchRepo, passwordHasher);
const updateUserUseCase = new UpdateUserUseCase(adminUserRepo, branchRepo);
const deleteUserUseCase = new DeleteUserUseCase(adminUserRepo);

export const usersController = new UsersController(
  listUsersUseCase,
  getUserUseCase,
  createUserUseCase,
  updateUserUseCase,
  deleteUserUseCase
);
