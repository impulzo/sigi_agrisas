import type { TicketSettingsRepository, UpdateTicketSettingsData } from "../ports/TicketSettingsRepository";
import type { TicketSettings } from "../../domain/entities/TicketSettings";

export class EmptyUpdateError extends Error {
  constructor() {
    super("At least one field must be provided");
    this.name = "EmptyUpdateError";
  }
}

export class UpdateTicketSettingsUseCase {
  constructor(private readonly repo: TicketSettingsRepository) {}

  async execute(data: UpdateTicketSettingsData): Promise<TicketSettings> {
    const keys: (keyof UpdateTicketSettingsData)[] = [
      "headerText",
      "footerText",
      "paperWidth",
      "businessAddress",
      "businessPhone",
      "businessTaxRegime",
      "legendText",
    ];
    if (keys.every((k) => data[k] === undefined)) {
      throw new EmptyUpdateError();
    }
    return this.repo.update(data);
  }
}
