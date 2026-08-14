import { UpdateTicketSettingsUseCase, EmptyUpdateError } from "@/modules/settings/application/use-cases/UpdateTicketSettingsUseCase";
import { InMemoryTicketSettingsRepository } from "@/modules/settings/infrastructure/repositories/InMemoryTicketSettingsRepository";
import { DEFAULT_TICKET_SETTINGS } from "@/modules/settings/domain/entities/TicketSettings";

describe("UpdateTicketSettingsUseCase", () => {
  it("updates a partial field, leaving others unchanged", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    await repo.update({ businessName: "Original" });
    const uc = new UpdateTicketSettingsUseCase(repo);

    const result = await uc.execute({ footerText: "Gracias" });

    expect(result).toEqual({ ...DEFAULT_TICKET_SETTINGS, businessName: "Original", footerText: "Gracias" });
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

  it("updates business fields", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    const uc = new UpdateTicketSettingsUseCase(repo);

    const result = await uc.execute({
      businessAddress: "Ocotlan de Morelos, Oaxaca. CP 71520",
      businessPhone: "951 292 80 86",
      businessTaxRegime: "612 Personas Físicas con Actividad Empresarial",
      legendText: "Gracias por su compra",
    });

    expect(result.businessAddress).toBe("Ocotlan de Morelos, Oaxaca. CP 71520");
    expect(result.businessPhone).toBe("951 292 80 86");
    expect(result.businessTaxRegime).toBe("612 Personas Físicas con Actividad Empresarial");
    expect(result.legendText).toBe("Gracias por su compra");
  });

  it("updates businessName and businessRfc", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    const uc = new UpdateTicketSettingsUseCase(repo);

    const result = await uc.execute({ businessName: "Agrisas S.A. de C.V.", businessRfc: "AGR010101AB1" });

    expect(result.businessName).toBe("Agrisas S.A. de C.V.");
    expect(result.businessRfc).toBe("AGR010101AB1");
  });

  it("clears businessRfc to null without touching businessName", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    const uc = new UpdateTicketSettingsUseCase(repo);
    await uc.execute({ businessName: "Agrisas", businessRfc: "AGR010101AB1" });

    const result = await uc.execute({ businessRfc: null });

    expect(result.businessRfc).toBeNull();
    expect(result.businessName).toBe("Agrisas");
  });
});
