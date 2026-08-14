import { GetTicketSettingsUseCase } from "@/modules/settings/application/use-cases/GetTicketSettingsUseCase";
import { InMemoryTicketSettingsRepository } from "@/modules/settings/infrastructure/repositories/InMemoryTicketSettingsRepository";
import { DEFAULT_TICKET_SETTINGS } from "@/modules/settings/domain/entities/TicketSettings";

describe("GetTicketSettingsUseCase", () => {
  it("returns defaults when no configuration exists", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    const uc = new GetTicketSettingsUseCase(repo);

    const result = await uc.execute();

    expect(result).toEqual(DEFAULT_TICKET_SETTINGS);
    expect(result.businessName).toBeNull();
    expect(result.businessRfc).toBeNull();
  });

  it("returns the persisted configuration when it exists", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    await repo.update({ footerText: "Gracias", paperWidth: "58mm" });
    const uc = new GetTicketSettingsUseCase(repo);

    const result = await uc.execute();

    expect(result).toEqual({ ...DEFAULT_TICKET_SETTINGS, footerText: "Gracias", paperWidth: "58mm" });
  });

  it("returns the persisted issuer identity (businessName/businessRfc) when set", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    await repo.update({ businessName: "Agrisas S.A. de C.V.", businessRfc: "AGR010101AB1" });
    const uc = new GetTicketSettingsUseCase(repo);

    const result = await uc.execute();

    expect(result.businessName).toBe("Agrisas S.A. de C.V.");
    expect(result.businessRfc).toBe("AGR010101AB1");
  });
});
