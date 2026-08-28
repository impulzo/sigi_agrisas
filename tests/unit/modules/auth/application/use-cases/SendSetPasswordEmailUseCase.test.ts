import { SendSetPasswordEmailUseCase } from "@/modules/auth/application/use-cases/SendSetPasswordEmailUseCase";
import { IssuePasswordSetupTokenUseCase } from "@/modules/auth/application/use-cases/IssuePasswordSetupTokenUseCase";
import { InMemoryUserRepository } from "@/modules/auth/infrastructure/repositories/InMemoryUserRepository";
import { InMemoryPasswordSetupTokenRepository } from "@/modules/auth/infrastructure/repositories/InMemoryPasswordSetupTokenRepository";
import { User } from "@/modules/auth/domain/entities/User";
import { UserNotFoundError } from "@/modules/auth/domain/errors/UserNotFoundError";
import { SetPasswordEmailSendFailedError } from "@/modules/auth/domain/errors/SetPasswordEmailSendFailedError";
import type { MailerPort } from "@/shared/application/ports/MailerPort";

describe("SendSetPasswordEmailUseCase", () => {
  let userRepo: InMemoryUserRepository;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    const now = new Date();
    await userRepo.save(
      User.create("user-1", {
        name: "Ana",
        email: "ana@example.com",
        passwordHash: null,
        roles: [],
        branchId: null,
        createdAt: now,
        updatedAt: now,
      })
    );
  });

  it("sends the email with a link built from the issued token", async () => {
    const mailer: MailerPort = { send: jest.fn().mockResolvedValue(undefined) };
    const issueUseCase = new IssuePasswordSetupTokenUseCase(new InMemoryPasswordSetupTokenRepository());
    const useCase = new SendSetPasswordEmailUseCase(userRepo, issueUseCase, mailer);

    const { sentTo } = await useCase.execute("user-1");

    expect(sentTo).toBe("ana@example.com");
    expect(mailer.send).toHaveBeenCalledTimes(1);
    const call = (mailer.send as jest.Mock).mock.calls[0][0];
    expect(call.to).toBe("ana@example.com");
    expect(call.html).toContain("/auth/set-password?token=");
  });

  it("throws UserNotFoundError for a non-existent user", async () => {
    const mailer: MailerPort = { send: jest.fn() };
    const issueUseCase = new IssuePasswordSetupTokenUseCase(new InMemoryPasswordSetupTokenRepository());
    const useCase = new SendSetPasswordEmailUseCase(userRepo, issueUseCase, mailer);

    await expect(useCase.execute("missing-user")).rejects.toThrow(UserNotFoundError);
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it("throws SetPasswordEmailSendFailedError when mailer.send fails (caller decides whether to swallow it)", async () => {
    const mailer: MailerPort = { send: jest.fn().mockRejectedValue(new Error("smtp down")) };
    const issueUseCase = new IssuePasswordSetupTokenUseCase(new InMemoryPasswordSetupTokenRepository());
    const useCase = new SendSetPasswordEmailUseCase(userRepo, issueUseCase, mailer);

    await expect(useCase.execute("user-1")).rejects.toThrow(SetPasswordEmailSendFailedError);
  });
});
