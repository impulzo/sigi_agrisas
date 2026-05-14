import { UserRepository } from "@/modules/auth/application/ports/UserRepository";
import { PasswordHasher } from "@/modules/auth/application/ports/PasswordHasher";
import { TokenService } from "@/modules/auth/application/ports/TokenService";
import { LoginRequest } from "@/modules/auth/application/dto/LoginRequest";
import { AuthResponse } from "@/modules/auth/application/dto/AuthResponse";
import { InvalidCredentialsError } from "@/modules/auth/domain/errors/InvalidCredentialsError";

export class LoginUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokenService: TokenService
  ) {}

  async execute(req: LoginRequest): Promise<AuthResponse> {
    const user = await this.userRepo.findByEmail(req.email.toLowerCase());
    if (!user) throw new InvalidCredentialsError();

    const valid = await this.hasher.compare(req.password, user.passwordHash);
    if (!valid) throw new InvalidCredentialsError();

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.tokenService.generateAccessToken(payload);
    const refreshToken = this.tokenService.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email },
    };
  }
}
