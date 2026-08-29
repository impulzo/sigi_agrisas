import { createHash } from "node:crypto";
import { UserRepository } from "@/modules/auth/application/ports/UserRepository";
import { PasswordSetupTokenRepository } from "@/modules/auth/application/ports/PasswordSetupTokenRepository";
import { PasswordHasher } from "@/modules/auth/application/ports/PasswordHasher";
import { TokenService } from "@/modules/auth/application/ports/TokenService";
import { AuthResponse } from "@/modules/auth/application/dto/AuthResponse";
import { Password } from "@/modules/auth/domain/value-objects/Password";
import { PasswordSetupTokenInvalidError } from "@/modules/auth/domain/errors/PasswordSetupTokenInvalidError";
import { PasswordSetupTokenExpiredError } from "@/modules/auth/domain/errors/PasswordSetupTokenExpiredError";

export interface CompletePasswordSetupRequest {
  token: string;
  password: string;
}

export class CompletePasswordSetupUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly tokenRepo: PasswordSetupTokenRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokenService: TokenService
  ) {}

  async execute(req: CompletePasswordSetupRequest): Promise<AuthResponse> {
    const tokenHash = createHash("sha256").update(req.token).digest("hex");
    const record = await this.tokenRepo.findValidByHash(tokenHash);
    if (!record) throw new PasswordSetupTokenInvalidError();
    if (record.expiresAt < new Date()) throw new PasswordSetupTokenExpiredError();

    Password.create(req.password);

    const passwordHash = await this.hasher.hash(req.password);
    await this.userRepo.updatePasswordHash(record.userId, passwordHash);
    await this.tokenRepo.markConsumed(record.id);

    const user = await this.userRepo.findById(record.userId);
    if (!user) throw new PasswordSetupTokenInvalidError();

    const payload = { sub: user.id, email: user.email, roles: user.roles, branchId: user.branchId };
    const accessToken = this.tokenService.generateAccessToken(payload);
    const refreshToken = this.tokenService.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }
}
