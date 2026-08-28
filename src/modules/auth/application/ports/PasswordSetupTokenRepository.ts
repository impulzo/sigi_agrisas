export interface PasswordSetupTokenRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  consumedAt: Date | null;
}

export interface PasswordSetupTokenRepository {
  create(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<PasswordSetupTokenRecord>;
  findValidByHash(tokenHash: string): Promise<PasswordSetupTokenRecord | null>;
  markConsumed(id: string): Promise<void>;
  invalidateAllForUser(userId: string): Promise<void>;
}
