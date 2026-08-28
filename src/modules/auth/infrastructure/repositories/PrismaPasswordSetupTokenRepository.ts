import { PrismaClient } from "@prisma/client";
import {
  PasswordSetupTokenRepository,
  PasswordSetupTokenRecord,
} from "@/modules/auth/application/ports/PasswordSetupTokenRepository";

export class PrismaPasswordSetupTokenRepository implements PasswordSetupTokenRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<PasswordSetupTokenRecord> {
    const row = await this.db.passwordSetupToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
    return { id: row.id, userId: row.userId, expiresAt: row.expiresAt, consumedAt: row.consumedAt };
  }

  async findValidByHash(tokenHash: string): Promise<PasswordSetupTokenRecord | null> {
    const row = await this.db.passwordSetupToken.findFirst({
      where: { tokenHash, consumedAt: null },
    });
    if (!row) return null;
    return { id: row.id, userId: row.userId, expiresAt: row.expiresAt, consumedAt: row.consumedAt };
  }

  async markConsumed(id: string): Promise<void> {
    await this.db.passwordSetupToken.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await this.db.passwordSetupToken.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }
}
