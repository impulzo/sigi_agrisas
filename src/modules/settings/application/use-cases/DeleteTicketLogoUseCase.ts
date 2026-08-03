import type { TicketSettingsRepository } from "../ports/TicketSettingsRepository";
import type { TicketLogoStorage } from "../ports/TicketLogoStorage";

export class DeleteTicketLogoUseCase {
  constructor(
    private readonly repo: TicketSettingsRepository,
    private readonly storage: TicketLogoStorage
  ) {}

  async execute(): Promise<void> {
    const current = await this.repo.get();
    if (!current.logoUrl) return; // idempotent: already null

    await this.storage.delete(current.logoUrl).catch(() => {});
    await this.repo.updateLogoUrl(null);
  }
}
