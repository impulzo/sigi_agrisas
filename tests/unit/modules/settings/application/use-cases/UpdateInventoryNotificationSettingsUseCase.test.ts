import { UpdateInventoryNotificationSettingsUseCase } from "@/modules/settings/application/use-cases/UpdateInventoryNotificationSettingsUseCase";
import { EmptyUpdateError } from "@/modules/settings/application/use-cases/UpdateTicketSettingsUseCase";
import { InMemoryInventoryNotificationSettingsRepository } from "@/modules/settings/infrastructure/repositories/InMemoryInventoryNotificationSettingsRepository";

describe("UpdateInventoryNotificationSettingsUseCase", () => {
  it("updates the configured email", async () => {
    const repo = new InMemoryInventoryNotificationSettingsRepository();
    const uc = new UpdateInventoryNotificationSettingsUseCase(repo);

    const result = await uc.execute({ expirationNotificationEmail: "compras@agrisas.mx" });

    expect(result).toEqual({ expirationNotificationEmail: "compras@agrisas.mx" });
  });

  it("clears the email to null", async () => {
    const repo = new InMemoryInventoryNotificationSettingsRepository();
    const uc = new UpdateInventoryNotificationSettingsUseCase(repo);
    await uc.execute({ expirationNotificationEmail: "compras@agrisas.mx" });

    const result = await uc.execute({ expirationNotificationEmail: null });

    expect(result).toEqual({ expirationNotificationEmail: null });
  });

  it("rejects an empty update", async () => {
    const repo = new InMemoryInventoryNotificationSettingsRepository();
    const uc = new UpdateInventoryNotificationSettingsUseCase(repo);

    await expect(uc.execute({})).rejects.toBeInstanceOf(EmptyUpdateError);
  });
});
