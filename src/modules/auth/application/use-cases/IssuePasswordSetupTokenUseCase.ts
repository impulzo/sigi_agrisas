import { randomBytes, createHash } from "node:crypto";
import { PasswordSetupTokenRepository } from "@/modules/auth/application/ports/PasswordSetupTokenRepository";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export class IssuePasswordSetupTokenUseCase {
  constructor(private readonly tokenRepo: PasswordSetupTokenRepository) {}

  async execute(userId: string): Promise<{ rawToken: string; expiresAt: Date }> {
    await this.tokenRepo.invalidateAllForUser(userId);

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await this.tokenRepo.create({ userId, tokenHash, expiresAt });

    return { rawToken, expiresAt };
  }
}
