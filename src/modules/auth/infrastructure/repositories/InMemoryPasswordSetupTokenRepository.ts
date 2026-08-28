import { randomUUID } from "node:crypto";
import {
  PasswordSetupTokenRepository,
  PasswordSetupTokenRecord,
} from "@/modules/auth/application/ports/PasswordSetupTokenRepository";

interface StoredToken extends PasswordSetupTokenRecord {
  tokenHash: string;
}

export class InMemoryPasswordSetupTokenRepository implements PasswordSetupTokenRepository {
  private readonly store = new Map<string, StoredToken>();

  async create(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<PasswordSetupTokenRecord> {
    const record: StoredToken = {
      id: randomUUID(),
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      consumedAt: null,
    };
    this.store.set(record.id, record);
    return record;
  }

  async findValidByHash(tokenHash: string): Promise<PasswordSetupTokenRecord | null> {
    for (const token of Array.from(this.store.values())) {
      if (token.tokenHash === tokenHash && token.consumedAt === null) return token;
    }
    return null;
  }

  async markConsumed(id: string): Promise<void> {
    const token = this.store.get(id);
    if (!token) return;
    token.consumedAt = new Date();
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    for (const token of Array.from(this.store.values())) {
      if (token.userId === userId && token.consumedAt === null) token.consumedAt = new Date();
    }
  }

  clear(): void {
    this.store.clear();
  }
}
