import { createHash } from "node:crypto";
import { IssuePasswordSetupTokenUseCase } from "@/modules/auth/application/use-cases/IssuePasswordSetupTokenUseCase";
import { InMemoryPasswordSetupTokenRepository } from "@/modules/auth/infrastructure/repositories/InMemoryPasswordSetupTokenRepository";

describe("IssuePasswordSetupTokenUseCase", () => {
  let repo: InMemoryPasswordSetupTokenRepository;
  let useCase: IssuePasswordSetupTokenUseCase;

  beforeEach(() => {
    repo = new InMemoryPasswordSetupTokenRepository();
    useCase = new IssuePasswordSetupTokenUseCase(repo);
  });

  it("returns a raw token whose hash matches what was persisted", async () => {
    const { rawToken } = await useCase.execute("user-1");
    const expectedHash = createHash("sha256").update(rawToken).digest("hex");
    const record = await repo.findValidByHash(expectedHash);
    expect(record).not.toBeNull();
    expect(record?.userId).toBe("user-1");
  });

  it("the raw token itself is never a valid lookup value", async () => {
    const { rawToken } = await useCase.execute("user-1");
    const record = await repo.findValidByHash(rawToken);
    expect(record).toBeNull();
  });

  it("sets an expiration ~24h in the future", async () => {
    const before = Date.now();
    const { expiresAt } = await useCase.execute("user-1");
    const diffHours = (expiresAt.getTime() - before) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(23.9);
    expect(diffHours).toBeLessThanOrEqual(24.1);
  });

  it("invalidates a previous unconsumed token for the same user when issuing a new one", async () => {
    const first = await useCase.execute("user-1");
    const firstHash = createHash("sha256").update(first.rawToken).digest("hex");

    const second = await useCase.execute("user-1");
    const secondHash = createHash("sha256").update(second.rawToken).digest("hex");

    expect(await repo.findValidByHash(firstHash)).toBeNull();
    expect(await repo.findValidByHash(secondHash)).not.toBeNull();
  });

  it("does not affect tokens belonging to a different user", async () => {
    const otherUserToken = await useCase.execute("user-2");
    const otherHash = createHash("sha256").update(otherUserToken.rawToken).digest("hex");

    await useCase.execute("user-1");

    expect(await repo.findValidByHash(otherHash)).not.toBeNull();
  });
});
