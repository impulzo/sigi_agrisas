import { NodemailerMailer } from "@/shared/infrastructure/mail/NodemailerMailer";
import type { MailerPort } from "@/shared/application/ports/MailerPort";

export const mailer: MailerPort = new NodemailerMailer();
