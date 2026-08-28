import { User } from "@/modules/auth/domain/entities/User";
import { UserRepository } from "@/modules/auth/application/ports/UserRepository";

export class InMemoryUserRepository implements UserRepository {
  private readonly store = new Map<string, User>();

  async findByEmail(email: string): Promise<User | null> {
    for (const user of Array.from(this.store.values())) {
      if (user.email === email) return user;
    }
    return null;
  }

  async findById(id: string): Promise<User | null> {
    return this.store.get(id) ?? null;
  }

  async save(user: User): Promise<void> {
    this.store.set(user.id, user);
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    const user = this.store.get(userId);
    if (!user) return;
    this.store.set(
      userId,
      User.create(userId, {
        name: user.name,
        email: user.email,
        passwordHash,
        roles: user.roles,
        branchId: user.branchId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
    );
  }

  clear(): void {
    this.store.clear();
  }
}
