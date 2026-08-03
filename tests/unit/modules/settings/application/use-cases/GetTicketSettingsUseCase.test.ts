import { GetTicketSettingsUseCase } from "@/modules/settings/application/use-cases/GetTicketSettingsUseCase";
import { InMemoryTicketSettingsRepository } from "@/modules/settings/infrastructure/repositories/InMemoryTicketSettingsRepository";

describe("GetTicketSettingsUseCase", () => {
  it("returns defaults when no configuration exists", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    const uc = new GetTicketSettingsUseCase(repo);

    const result = await uc.execute();

    expect(result).toEqual({ logoUrl: null, headerText: null, footerText: null, paperWidth: "80mm" });
  });

  it("returns the persisted configuration when it exists", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    await repo.update({ headerText: "Mi Negocio", footerText: "Gracias", paperWidth: "58mm" });
    const uc = new GetTicketSettingsUseCase(repo);

    const result = await uc.execute();

    expect(result).toEqual({ logoUrl: null, headerText: "Mi Negocio", footerText: "Gracias", paperWidth: "58mm" });
  });
});
