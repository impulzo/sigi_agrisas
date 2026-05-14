import { User } from "@/modules/auth/domain/entities/User";
import { UserRepository } from "@/modules/auth/application/ports/UserRepository";
import { PasswordHasher } from "@/modules/auth/application/ports/PasswordHasher";
import { RegisterRequest } from "@/modules/auth/application/dto/RegisterRequest";
import { RegisterResponse } from "@/modules/auth/application/dto/AuthResponse";
import { EmailAlreadyInUseError } from "@/modules/auth/domain/errors/EmailAlreadyInUseError";
import { Email } from "@/modules/auth/domain/value-objects/Email";
import { Password } from "@/modules/auth/domain/value-objects/Password";
import { randomUUID } from "crypto";

export class RegisterUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(req: RegisterRequest): Promise<RegisterResponse> {
    const email = Email.create(req.email);
    Password.create(req.password);

    const existing = await this.userRepo.findByEmail(email.value);
    if (existing) throw new EmailAlreadyInUseError();

    const hash = await this.hasher.hash(req.password);
    const now = new Date();
    const user = User.create(randomUUID(), {
      email: email.value,
      passwordHash: hash,
      createdAt: now,
      updatedAt: now,
    });

    await this.userRepo.save(user);

    return { user: { id: user.id, email: user.email } };
  }
}
