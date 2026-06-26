import { User } from "@/modules/auth/domain/entities/User";
import { UserRepository } from "@/modules/auth/application/ports/UserRepository";
import { PasswordHasher } from "@/modules/auth/application/ports/PasswordHasher";
import { TokenService } from "@/modules/auth/application/ports/TokenService";
import { RegisterRequest } from "@/modules/auth/application/dto/RegisterRequest";
import { AuthResponse } from "@/modules/auth/application/dto/AuthResponse";
import { EmailAlreadyInUseError } from "@/modules/auth/domain/errors/EmailAlreadyInUseError";
import { Email } from "@/modules/auth/domain/value-objects/Email";
import { Password } from "@/modules/auth/domain/value-objects/Password";
import { RoleAssigner } from "@/modules/rbac/application/ports/RoleAssigner";
import { randomUUID } from "crypto";

export class RegisterUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly roleAssigner: RoleAssigner
  ) {}

  async execute(req: RegisterRequest): Promise<AuthResponse> {
    const email = Email.create(req.email);
    Password.create(req.password);

    const existing = await this.userRepo.findByEmail(email.value);
    if (existing) throw new EmailAlreadyInUseError();

    const hash = await this.hasher.hash(req.password);
    const now = new Date();
    const user = User.create(randomUUID(), {
      name: req.name,
      email: email.value,
      passwordHash: hash,
      roles: [],
      branchId: null,
      createdAt: now,
      updatedAt: now,
    });

    await this.userRepo.save(user);
    await this.roleAssigner.assignDefaultRole(user.id);

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
