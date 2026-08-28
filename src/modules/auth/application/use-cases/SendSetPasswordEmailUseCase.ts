import { UserRepository } from "@/modules/auth/application/ports/UserRepository";
import { IssuePasswordSetupTokenUseCase } from "@/modules/auth/application/use-cases/IssuePasswordSetupTokenUseCase";
import { UserNotFoundError } from "@/modules/auth/domain/errors/UserNotFoundError";
import { SetPasswordEmailSendFailedError } from "@/modules/auth/domain/errors/SetPasswordEmailSendFailedError";
import type { MailerPort } from "@/shared/application/ports/MailerPort";

export class SendSetPasswordEmailUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly issueTokenUseCase: IssuePasswordSetupTokenUseCase,
    private readonly mailer: MailerPort
  ) {}

  async execute(userId: string): Promise<{ sentTo: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new UserNotFoundError();

    const { rawToken } = await this.issueTokenUseCase.execute(userId);
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const link = `${appUrl}/auth/set-password?token=${rawToken}`;

    try {
      await this.mailer.send({
        to: user.email,
        subject: "Establece tu contraseña — Agrisas",
        html: `
          <p>Hola${user.name ? ` ${user.name}` : ""},</p>
          <p>Da clic en el siguiente enlace para establecer tu contraseña de acceso al panel Agrisas. El enlace expira en 24 horas y solo puede usarse una vez.</p>
          <p><a href="${link}">${link}</a></p>
        `,
      });
    } catch (err) {
      throw new SetPasswordEmailSendFailedError(err);
    }

    return { sentTo: user.email };
  }
}
