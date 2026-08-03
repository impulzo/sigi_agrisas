export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  attachments?: MailAttachment[];
}

export interface MailerPort {
  send(message: MailMessage): Promise<void>;
}
