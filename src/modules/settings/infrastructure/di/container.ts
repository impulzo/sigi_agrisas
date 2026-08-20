import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaTicketSettingsRepository } from "../repositories/PrismaTicketSettingsRepository";
import { PrismaPricingSettingsRepository } from "../repositories/PrismaPricingSettingsRepository";
import { PrismaInventoryNotificationSettingsRepository } from "../repositories/PrismaInventoryNotificationSettingsRepository";
import { SupabaseTicketLogoStorage } from "../services/SupabaseTicketLogoStorage";
import { GetTicketSettingsUseCase } from "../../application/use-cases/GetTicketSettingsUseCase";
import { UpdateTicketSettingsUseCase } from "../../application/use-cases/UpdateTicketSettingsUseCase";
import { UploadTicketLogoUseCase } from "../../application/use-cases/UploadTicketLogoUseCase";
import { DeleteTicketLogoUseCase } from "../../application/use-cases/DeleteTicketLogoUseCase";
import { GetPricingSettingsUseCase } from "../../application/use-cases/GetPricingSettingsUseCase";
import { UpdatePricingSettingsUseCase } from "../../application/use-cases/UpdatePricingSettingsUseCase";
import { GetInventoryNotificationSettingsUseCase } from "../../application/use-cases/GetInventoryNotificationSettingsUseCase";
import { UpdateInventoryNotificationSettingsUseCase } from "../../application/use-cases/UpdateInventoryNotificationSettingsUseCase";
import { SettingsController } from "../http/SettingsController";

const repo = new PrismaTicketSettingsRepository(prisma);
const storage = new SupabaseTicketLogoStorage();
const pricingRepo = new PrismaPricingSettingsRepository(prisma);
const inventoryNotificationsRepo = new PrismaInventoryNotificationSettingsRepository(prisma);

export const settingsController = new SettingsController(
  new GetTicketSettingsUseCase(repo),
  new UpdateTicketSettingsUseCase(repo),
  new UploadTicketLogoUseCase(repo, storage),
  new DeleteTicketLogoUseCase(repo, storage),
  new GetPricingSettingsUseCase(pricingRepo),
  new UpdatePricingSettingsUseCase(pricingRepo),
  new GetInventoryNotificationSettingsUseCase(inventoryNotificationsRepo),
  new UpdateInventoryNotificationSettingsUseCase(inventoryNotificationsRepo)
);
