import { prisma } from "@/shared/infrastructure/prisma/client";
import { mailer } from "@/shared/infrastructure/di/mailerContainer";
import { UserPrismaRepository } from "@/modules/auth/infrastructure/repositories/UserPrismaRepository";
import { PrismaPasswordSetupTokenRepository } from "@/modules/auth/infrastructure/repositories/PrismaPasswordSetupTokenRepository";
import { JwtTokenService } from "@/modules/auth/infrastructure/services/JwtTokenService";
import { BcryptPasswordHasher } from "@/modules/auth/infrastructure/services/BcryptPasswordHasher";
import { RegisterUseCase } from "@/modules/auth/application/use-cases/RegisterUseCase";
import { LoginUseCase } from "@/modules/auth/application/use-cases/LoginUseCase";
import { RefreshTokenUseCase } from "@/modules/auth/application/use-cases/RefreshTokenUseCase";
import { LogoutUseCase } from "@/modules/auth/application/use-cases/LogoutUseCase";
import { IssuePasswordSetupTokenUseCase } from "@/modules/auth/application/use-cases/IssuePasswordSetupTokenUseCase";
import { SendSetPasswordEmailUseCase } from "@/modules/auth/application/use-cases/SendSetPasswordEmailUseCase";
import { CompletePasswordSetupUseCase } from "@/modules/auth/application/use-cases/CompletePasswordSetupUseCase";
import { AuthController } from "@/modules/auth/infrastructure/http/AuthController";
import { PrismaRoleAssigner } from "@/modules/rbac/infrastructure/services/PrismaRoleAssigner";

const userRepo = new UserPrismaRepository(prisma);
const tokenSetupRepo = new PrismaPasswordSetupTokenRepository(prisma);
const tokenService = new JwtTokenService();
const hasher = new BcryptPasswordHasher();
const roleAssigner = new PrismaRoleAssigner(prisma);

const issuePasswordSetupTokenUseCase = new IssuePasswordSetupTokenUseCase(tokenSetupRepo);

export const sendSetPasswordEmailUseCase = new SendSetPasswordEmailUseCase(
  userRepo,
  issuePasswordSetupTokenUseCase,
  mailer
);

export const authController = (() => {
  try {
    const registerUseCase = new RegisterUseCase(userRepo, hasher, tokenService, roleAssigner);
    const loginUseCase = new LoginUseCase(userRepo, hasher, tokenService);
    const refreshTokenUseCase = new RefreshTokenUseCase(tokenService);
    const logoutUseCase = new LogoutUseCase();
    const completePasswordSetupUseCase = new CompletePasswordSetupUseCase(
      userRepo,
      tokenSetupRepo,
      hasher,
      tokenService
    );

    return new AuthController(
      registerUseCase,
      loginUseCase,
      refreshTokenUseCase,
      logoutUseCase,
      completePasswordSetupUseCase
    );
  } catch (err) {
    console.error("[auth/di] failed to initialize AuthController:", err);
    throw err;
  }
})();
