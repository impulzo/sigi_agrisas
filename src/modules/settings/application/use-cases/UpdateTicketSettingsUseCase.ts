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
    if (data.headerText === undefined && data.footerText === undefined && data.paperWidth === undefined) {
      throw new EmptyUpdateError();
    }
    return this.repo.update(data);
  }
}
