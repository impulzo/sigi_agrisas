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

  clear(): void {
    this.store.clear();
  }
}
