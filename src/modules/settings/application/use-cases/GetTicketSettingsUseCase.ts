import type { TicketSettingsRepository } from "../ports/TicketSettingsRepository";
import type { TicketSettings } from "../../domain/entities/TicketSettings";

export class GetTicketSettingsUseCase {
  constructor(private readonly repo: TicketSettingsRepository) {}

  async execute(): Promise<TicketSettings> {
    return this.repo.get();
  }
}
