import { prisma } from "@/shared/infrastructure/prisma/client";
import { UserPrismaRepository } from "@/modules/auth/infrastructure/repositories/UserPrismaRepository";
import { JwtTokenService } from "@/modules/auth/infrastructure/services/JwtTokenService";
import { BcryptPasswordHasher } from "@/modules/auth/infrastructure/services/BcryptPasswordHasher";
import { RegisterUseCase } from "@/modules/auth/application/use-cases/RegisterUseCase";
import { LoginUseCase } from "@/modules/auth/application/use-cases/LoginUseCase";
import { RefreshTokenUseCase } from "@/modules/auth/application/use-cases/RefreshTokenUseCase";
import { LogoutUseCase } from "@/modules/auth/application/use-cases/LogoutUseCase";
import { AuthController } from "@/modules/auth/infrastructure/http/AuthController";

const userRepo = new UserPrismaRepository(prisma);
const tokenService = new JwtTokenService();
const hasher = new BcryptPasswordHasher();

const registerUseCase = new RegisterUseCase(userRepo, hasher);
const loginUseCase = new LoginUseCase(userRepo, hasher, tokenService);
const refreshTokenUseCase = new RefreshTokenUseCase(tokenService);
const logoutUseCase = new LogoutUseCase();

export const authController = new AuthController(
  registerUseCase,
  loginUseCase,
  refreshTokenUseCase,
  logoutUseCase
);
