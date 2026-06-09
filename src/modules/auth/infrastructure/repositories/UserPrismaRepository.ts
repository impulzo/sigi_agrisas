import { PrismaClient } from "@prisma/client";
import { User } from "@/modules/auth/domain/entities/User";
import { UserRepository } from "@/modules/auth/application/ports/UserRepository";
import { UserMapper } from "@/modules/auth/application/mappers/UserMapper";
import { EmailAlreadyInUseError } from "@/modules/auth/domain/errors/EmailAlreadyInUseError";

function isPrismaUniqueConstraint(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}

export class UserPrismaRepository implements UserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });
    if (!row) return null;
    return UserMapper.toDomain(row);
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!row) return null;
    return UserMapper.toDomain(row);
  }

  async save(user: User): Promise<void> {
    try {
      await this.db.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
        },
        update: {
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
        },
      });
    } catch (err) {
      if (isPrismaUniqueConstraint(err)) throw new EmailAlreadyInUseError();
      throw err;
    }
  }
}
