import { AdminNotificationService } from "@/shared/application/services/AdminNotificationService";
import type { MailerPort } from "@/shared/application/ports/MailerPort";

describe("AdminNotificationService", () => {
  const originalEnv = process.env.ADMIN_NOTIFICATION_EMAIL;

  afterEach(() => {
    process.env.ADMIN_NOTIFICATION_EMAIL = originalEnv;
    jest.restoreAllMocks();
  });

  describe("notifySaleCancelled", () => {
    it("sends an email to ADMIN_NOTIFICATION_EMAIL when configured", async () => {
      process.env.ADMIN_NOTIFICATION_EMAIL = "admin@agrisas.mx";
      const mailer: MailerPort = { send: jest.fn().mockResolvedValue(undefined) };
      const service = new AdminNotificationService(mailer);

      await service.notifySaleCancelled({
        folioCode: "TK-000042",
        total: 1500,
        cancellationReason: "Cliente cambió de opinión",
        branchName: "Matriz",
        cashierName: "Admin",
      });

      expect(mailer.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: "admin@agrisas.mx", subject: expect.stringContaining("TK-000042") })
      );
    });

    it("does not attempt to send when ADMIN_NOTIFICATION_EMAIL is unset", async () => {
      delete process.env.ADMIN_NOTIFICATION_EMAIL;
      const mailer: MailerPort = { send: jest.fn().mockResolvedValue(undefined) };
      const service = new AdminNotificationService(mailer);

      await service.notifySaleCancelled({
        folioCode: "TK-000042",
        total: 1500,
        cancellationReason: null,
        branchName: "Matriz",
        cashierName: "Admin",
      });

      expect(mailer.send).not.toHaveBeenCalled();
    });

    it("swallows mailer errors without throwing", async () => {
      process.env.ADMIN_NOTIFICATION_EMAIL = "admin@agrisas.mx";
      const mailer: MailerPort = { send: jest.fn().mockRejectedValue(new Error("SMTP down")) };
      jest.spyOn(console, "error").mockImplementation(() => {});
      const service = new AdminNotificationService(mailer);

      await expect(
        service.notifySaleCancelled({
          folioCode: "TK-000042",
          total: 1500,
          cancellationReason: null,
          branchName: "Matriz",
          cashierName: "Admin",
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("notifyLowStock", () => {
    it("sends an email with product/stock details when configured", async () => {
      process.env.ADMIN_NOTIFICATION_EMAIL = "admin@agrisas.mx";
      const mailer: MailerPort = { send: jest.fn().mockResolvedValue(undefined) };
      const service = new AdminNotificationService(mailer);

      await service.notifyLowStock({
        productName: "PACKHARD 20 L",
        productCode: "PK20",
        branchName: "Matriz",
        quantity: 5,
        reorderPoint: 10,
      });

      expect(mailer.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: "admin@agrisas.mx", subject: expect.stringContaining("PACKHARD 20 L") })
      );
    });

    it("swallows mailer errors without throwing", async () => {
      process.env.ADMIN_NOTIFICATION_EMAIL = "admin@agrisas.mx";
      const mailer: MailerPort = { send: jest.fn().mockRejectedValue(new Error("SMTP down")) };
      jest.spyOn(console, "error").mockImplementation(() => {});
      const service = new AdminNotificationService(mailer);

      await expect(
        service.notifyLowStock({
          productName: "PACKHARD 20 L",
          productCode: "PK20",
          branchName: "Matriz",
          quantity: 5,
          reorderPoint: 10,
        })
      ).resolves.toBeUndefined();
    });
  });
});
