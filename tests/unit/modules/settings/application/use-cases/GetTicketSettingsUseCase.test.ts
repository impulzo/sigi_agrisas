import { GetTicketSettingsUseCase } from "@/modules/settings/application/use-cases/GetTicketSettingsUseCase";
import { InMemoryTicketSettingsRepository } from "@/modules/settings/infrastructure/repositories/InMemoryTicketSettingsRepository";
import { DEFAULT_TICKET_SETTINGS } from "@/modules/settings/domain/entities/TicketSettings";

describe("GetTicketSettingsUseCase", () => {
  it("returns defaults when no configuration exists", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    const uc = new GetTicketSettingsUseCase(repo);

    const result = await uc.execute();

    expect(result).toEqual(DEFAULT_TICKET_SETTINGS);
  });

  it("returns the persisted configuration when it exists", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    await repo.update({ headerText: "Mi Negocio", footerText: "Gracias", paperWidth: "58mm" });
    const uc = new GetTicketSettingsUseCase(repo);

    const result = await uc.execute();

    expect(result).toEqual({ ...DEFAULT_TICKET_SETTINGS, headerText: "Mi Negocio", footerText: "Gracias", paperWidth: "58mm" });
  });
});
