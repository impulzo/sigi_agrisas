import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaWaybillRepository } from "../repositories/PrismaWaybillRepository";
import { PrismaWaybillLookupService } from "../services/PrismaWaybillLookupService";
import { FacturamaRestGateway } from "../services/FacturamaRestGateway";
import { FakeFacturamaGateway } from "../services/FakeFacturamaGateway";
import { CreateWaybillUseCase } from "../../application/use-cases/CreateWaybillUseCase";
import { CancelWaybillUseCase } from "../../application/use-cases/CancelWaybillUseCase";
import { ListWaybillsUseCase } from "../../application/use-cases/ListWaybillsUseCase";
import { GetWaybillUseCase } from "../../application/use-cases/GetWaybillUseCase";
import { DownloadWaybillFileUseCase } from "../../application/use-cases/DownloadWaybillFileUseCase";
import { WaybillsController } from "../http/WaybillsController";
import { rbacContainer } from "@/modules/rbac/infrastructure/di/container";
import type { WaybillFacturamaGateway } from "../../application/ports/WaybillFacturamaGateway";

const isMock = process.env.FACTURAMA_MOCK !== "false";
const gateway: WaybillFacturamaGateway = isMock ? new FakeFacturamaGateway() : new FacturamaRestGateway();

const waybillRepo = new PrismaWaybillRepository(prisma);
const lookupService = new PrismaWaybillLookupService(prisma);

const createUseCase = new CreateWaybillUseCase(waybillRepo, gateway, lookupService);
const cancelUseCase = new CancelWaybillUseCase(waybillRepo, gateway);
const listUseCase = new ListWaybillsUseCase(waybillRepo);
const getUseCase = new GetWaybillUseCase(waybillRepo);
const downloadUseCase = new DownloadWaybillFileUseCase(waybillRepo, gateway);

export const waybillsController = new WaybillsController(
  createUseCase,
  cancelUseCase,
  listUseCase,
  getUseCase,
  downloadUseCase,
  rbacContainer.authorizationService
);
