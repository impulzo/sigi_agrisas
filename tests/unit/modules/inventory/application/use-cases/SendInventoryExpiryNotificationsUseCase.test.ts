import { SendInventoryExpiryNotificationsUseCase } from "@/modules/inventory/application/use-cases/SendInventoryExpiryNotificationsUseCase";
import { InMemoryInventoryLotRepository } from "@/modules/inventory/infrastructure/repositories/InMemoryInventoryLotRepository";
import { AdminNotificationService } from "@/shared/application/services/AdminNotificationService";
import type { MailerPort } from "@/shared/application/ports/MailerPort";
import type { InventoryNotificationSettingsPort } from "@/modules/inventory/application/ports/InventoryNotificationSettingsPort";
import type { InventoryLotExpirySnapshot } from "@/modules/inventory/domain/services/InventoryLotExpiryNotificationPolicy";

const REFERENCE_DATE = new Date("2026-08-14T00:00:00.000Z");

class FakeSettingsPort implements InventoryNotificationSettingsPort {
  constructor(private email: string | null) {}
  async getExpirationNotificationEmail(): Promise<string | null> {
    return this.email;
  }
}

function baseLot(overrides: Partial<InventoryLotExpirySnapshot>): InventoryLotExpirySnapshot {
  return {
    id: "lot-1",
    expirationDate: new Date("2027-02-14T00:00:00.000Z"),
    notifiedSixMonthsAt: null,
    notifiedThreeMonthsAt: null,
    notifiedDayOfAt: null,
    productName: "PACKHARD 20 L",
    branchName: "Matriz",
    lotNumber: "L-001",
    quantity: 10,
    ...overrides,
  };
}

describe("SendInventoryExpiryNotificationsUseCase", () => {
  it("does not touch the lot repository nor send mail when no recipient is configured", async () => {
    const lotRepo = new InMemoryInventoryLotRepository();
    lotRepo.seedExpirySnapshot(baseLot({}));
    const mailer: MailerPort = { send: jest.fn().mockResolvedValue(undefined) };
    const notifier = new AdminNotificationService(mailer);
    const uc = new SendInventoryExpiryNotificationsUseCase(lotRepo, new FakeSettingsPort(null), notifier);

    await uc.execute(REFERENCE_DATE);

    expect(mailer.send).not.toHaveBeenCalled();
    const pending = await lotRepo.findPendingExpiryNotificationLots();
    expect(pending[0].notifiedSixMonthsAt).toBeNull();
  });

  it("groups multiple lots crossing the same threshold into a single digest", async () => {
    const lotRepo = new InMemoryInventoryLotRepository();
    lotRepo.seedExpirySnapshot(baseLot({ id: "lot-1", expirationDate: new Date("2027-02-14T00:00:00.000Z") }));
    lotRepo.seedExpirySnapshot(baseLot({ id: "lot-2", expirationDate: new Date("2027-02-10T00:00:00.000Z") }));
    const mailer: MailerPort = { send: jest.fn().mockResolvedValue(undefined) };
    const notifier = new AdminNotificationService(mailer);
    const uc = new SendInventoryExpiryNotificationsUseCase(
      lotRepo,
      new FakeSettingsPort("compras@agrisas.mx"),
      notifier
    );

    await uc.execute(REFERENCE_DATE);

    expect(mailer.send).toHaveBeenCalledTimes(1);
    expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({ to: "compras@agrisas.mx" }));
    const pending = await lotRepo.findPendingExpiryNotificationLots();
    expect(pending.every((l) => l.notifiedSixMonthsAt !== null)).toBe(true);
  });

  it("sends a separate digest per threshold and marks each lot's flags", async () => {
    const lotRepo = new InMemoryInventoryLotRepository();
    lotRepo.seedExpirySnapshot(baseLot({ id: "lot-6m", expirationDate: new Date("2027-02-14T00:00:00.000Z") }));
    lotRepo.seedExpirySnapshot(
      baseLot({
        id: "lot-3m",
        expirationDate: new Date("2026-11-14T00:00:00.000Z"),
        notifiedSixMonthsAt: REFERENCE_DATE,
      })
    );
    const mailer: MailerPort = { send: jest.fn().mockResolvedValue(undefined) };
    const notifier = new AdminNotificationService(mailer);
    const uc = new SendInventoryExpiryNotificationsUseCase(
      lotRepo,
      new FakeSettingsPort("compras@agrisas.mx"),
      notifier
    );

    await uc.execute(REFERENCE_DATE);

    expect(mailer.send).toHaveBeenCalledTimes(2);
    const [sixMonthsLot] = await lotRepo.findPendingExpiryNotificationLots();
    expect(sixMonthsLot).toBeDefined();
  });

  it("marks lots as notified even when the mailer fails (best-effort)", async () => {
    const lotRepo = new InMemoryInventoryLotRepository();
    lotRepo.seedExpirySnapshot(baseLot({}));
    const mailer: MailerPort = { send: jest.fn().mockRejectedValue(new Error("SMTP down")) };
    jest.spyOn(console, "error").mockImplementation(() => {});
    const notifier = new AdminNotificationService(mailer);
    const uc = new SendInventoryExpiryNotificationsUseCase(
      lotRepo,
      new FakeSettingsPort("compras@agrisas.mx"),
      notifier
    );

    await uc.execute(REFERENCE_DATE);

    const [lot] = await lotRepo.findPendingExpiryNotificationLots();
    expect(lot.notifiedSixMonthsAt).not.toBeNull();
  });

  it("does nothing when there are no pending lots", async () => {
    const lotRepo = new InMemoryInventoryLotRepository();
    const mailer: MailerPort = { send: jest.fn().mockResolvedValue(undefined) };
    const notifier = new AdminNotificationService(mailer);
    const uc = new SendInventoryExpiryNotificationsUseCase(
      lotRepo,
      new FakeSettingsPort("compras@agrisas.mx"),
      notifier
    );

    await uc.execute(REFERENCE_DATE);

    expect(mailer.send).not.toHaveBeenCalled();
  });
});
