import nodemailer, { type Transporter } from "nodemailer";
import type { MailerPort, MailMessage } from "@/shared/application/ports/MailerPort";
import { SmtpNotConfiguredError } from "@/shared/domain/errors/SmtpNotConfiguredError";

export class NodemailerMailer implements MailerPort {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;
    if (!process.env.SMTP_HOST) throw new SmtpNotConfiguredError();
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    return this.transporter;
  }

  async send(message: MailMessage): Promise<void> {
    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
  }
}
