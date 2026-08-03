import { AdminNotificationService } from "@/shared/application/services/AdminNotificationService";
import { mailer } from "@/shared/infrastructure/di/mailerContainer";

export const adminNotificationService = new AdminNotificationService(mailer);
