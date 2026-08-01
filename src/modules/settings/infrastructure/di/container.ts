import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaTicketSettingsRepository } from "../repositories/PrismaTicketSettingsRepository";
import { SupabaseTicketLogoStorage } from "../services/SupabaseTicketLogoStorage";
import { GetTicketSettingsUseCase } from "../../application/use-cases/GetTicketSettingsUseCase";
import { UpdateTicketSettingsUseCase } from "../../application/use-cases/UpdateTicketSettingsUseCase";
import { UploadTicketLogoUseCase } from "../../application/use-cases/UploadTicketLogoUseCase";
import { DeleteTicketLogoUseCase } from "../../application/use-cases/DeleteTicketLogoUseCase";
import { SettingsController } from "../http/SettingsController";

const repo = new PrismaTicketSettingsRepository(prisma);
const storage = new SupabaseTicketLogoStorage();

export const settingsController = new SettingsController(
  new GetTicketSettingsUseCase(repo),
  new UpdateTicketSettingsUseCase(repo),
  new UploadTicketLogoUseCase(repo, storage),
  new DeleteTicketLogoUseCase(repo, storage)
);
