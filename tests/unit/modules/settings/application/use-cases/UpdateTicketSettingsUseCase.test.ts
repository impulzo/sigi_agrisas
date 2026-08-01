import { UpdateTicketSettingsUseCase, EmptyUpdateError } from "@/modules/settings/application/use-cases/UpdateTicketSettingsUseCase";
import { InMemoryTicketSettingsRepository } from "@/modules/settings/infrastructure/repositories/InMemoryTicketSettingsRepository";

describe("UpdateTicketSettingsUseCase", () => {
  it("updates a partial field, leaving others unchanged", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    await repo.update({ headerText: "Original" });
    const uc = new UpdateTicketSettingsUseCase(repo);

    const result = await uc.execute({ footerText: "Gracias" });

    expect(result).toEqual({ logoUrl: null, headerText: "Original", footerText: "Gracias", paperWidth: "80mm" });
  });

  it("rejects an empty update", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    const uc = new UpdateTicketSettingsUseCase(repo);

    await expect(uc.execute({})).rejects.toBeInstanceOf(EmptyUpdateError);
  });

  it("creates the singleton row on first write", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    const uc = new UpdateTicketSettingsUseCase(repo);

    const result = await uc.execute({ paperWidth: "58mm" });

    expect(result.paperWidth).toBe("58mm");
    await expect(repo.get()).resolves.toEqual(result);
  });

  it("updates the same row on a second write instead of creating another", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    const uc = new UpdateTicketSettingsUseCase(repo);
    await uc.execute({ paperWidth: "58mm" });

    const result = await uc.execute({ paperWidth: "80mm" });

    expect(result.paperWidth).toBe("80mm");
  });
});
