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

    it("escapes HTML in cancellationReason before interpolating it into the email body", async () => {
      process.env.ADMIN_NOTIFICATION_EMAIL = "admin@agrisas.mx";
      const mailer: MailerPort = { send: jest.fn().mockResolvedValue(undefined) };
      const service = new AdminNotificationService(mailer);

      await service.notifySaleCancelled({
        folioCode: "TK-000042",
        total: 1500,
        cancellationReason: '<img src=x onerror="alert(1)">',
        branchName: "Matriz",
        cashierName: "Admin",
      });

      const sentHtml = (mailer.send as jest.Mock).mock.calls[0][0].html as string;
      expect(sentHtml).not.toContain("<img");
      expect(sentHtml).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
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

  describe("notifyInventoryExpiryDigest", () => {
    const items = [
      {
        productName: "PACKHARD 20 L",
        branchName: "Matriz",
        lotNumber: "L-001",
        quantity: 10,
        expirationDate: new Date("2027-02-14T00:00:00.000Z"),
      },
    ];

    it("sends a digest email to the explicit recipient", async () => {
      const mailer: MailerPort = { send: jest.fn().mockResolvedValue(undefined) };
      const service = new AdminNotificationService(mailer);

      await service.notifyInventoryExpiryDigest({ to: "compras@agrisas.mx", threshold: "threeMonths", items });

      expect(mailer.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: "compras@agrisas.mx", subject: expect.stringContaining("3 meses") })
      );
    });

    it("does not attempt to send when `to` is null", async () => {
      const mailer: MailerPort = { send: jest.fn().mockResolvedValue(undefined) };
      const service = new AdminNotificationService(mailer);

      await service.notifyInventoryExpiryDigest({ to: null, threshold: "dayOf", items });

      expect(mailer.send).not.toHaveBeenCalled();
    });

    it("does not attempt to send when `to` is empty string", async () => {
      const mailer: MailerPort = { send: jest.fn().mockResolvedValue(undefined) };
      const service = new AdminNotificationService(mailer);

      await service.notifyInventoryExpiryDigest({ to: "", threshold: "dayOf", items });

      expect(mailer.send).not.toHaveBeenCalled();
    });

    it("swallows mailer errors without throwing", async () => {
      const mailer: MailerPort = { send: jest.fn().mockRejectedValue(new Error("SMTP down")) };
      jest.spyOn(console, "error").mockImplementation(() => {});
      const service = new AdminNotificationService(mailer);

      await expect(
        service.notifyInventoryExpiryDigest({ to: "compras@agrisas.mx", threshold: "sixMonths", items })
      ).resolves.toBeUndefined();
    });
  });
});
