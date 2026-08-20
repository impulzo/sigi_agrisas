import { GetInventoryNotificationSettingsUseCase } from "@/modules/settings/application/use-cases/GetInventoryNotificationSettingsUseCase";
import { InMemoryInventoryNotificationSettingsRepository } from "@/modules/settings/infrastructure/repositories/InMemoryInventoryNotificationSettingsRepository";
import { DEFAULT_INVENTORY_NOTIFICATION_SETTINGS } from "@/modules/settings/domain/entities/InventoryNotificationSettings";

describe("GetInventoryNotificationSettingsUseCase", () => {
  it("returns defaults when no configuration exists", async () => {
    const repo = new InMemoryInventoryNotificationSettingsRepository();
    const uc = new GetInventoryNotificationSettingsUseCase(repo);

    const result = await uc.execute();

    expect(result).toEqual(DEFAULT_INVENTORY_NOTIFICATION_SETTINGS);
  });

  it("returns the persisted configuration when it exists", async () => {
    const repo = new InMemoryInventoryNotificationSettingsRepository();
    await repo.update({ expirationNotificationEmail: "compras@agrisas.mx" });
    const uc = new GetInventoryNotificationSettingsUseCase(repo);

    const result = await uc.execute();

    expect(result).toEqual({ expirationNotificationEmail: "compras@agrisas.mx" });
  });
});
