import type {
  InventoryNotificationSettingsRepository,
  UpdateInventoryNotificationSettingsData,
} from "../ports/InventoryNotificationSettingsRepository";
import type { InventoryNotificationSettings } from "../../domain/entities/InventoryNotificationSettings";
import { EmptyUpdateError } from "./UpdateTicketSettingsUseCase";

export class UpdateInventoryNotificationSettingsUseCase {
  constructor(private readonly repo: InventoryNotificationSettingsRepository) {}

  async execute(data: UpdateInventoryNotificationSettingsData): Promise<InventoryNotificationSettings> {
    if (data.expirationNotificationEmail === undefined) {
      throw new EmptyUpdateError();
    }
    return this.repo.update(data);
  }
}
