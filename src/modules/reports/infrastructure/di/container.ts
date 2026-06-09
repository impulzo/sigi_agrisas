import { prisma } from "@/shared/infrastructure/prisma/client";
import { rbacContainer } from "@/modules/rbac/infrastructure/di/container";
import { PrismaInventoryReportRepository } from "../repositories/PrismaInventoryReportRepository";
import { PrismaPaymentReportRepository } from "../repositories/PrismaPaymentReportRepository";
import { GetInventoryStockReportUseCase } from "../../application/use-cases/GetInventoryStockReportUseCase";
import { GetPaymentHistoryReportUseCase } from "../../application/use-cases/GetPaymentHistoryReportUseCase";
import { ReportsController } from "../http/ReportsController";

const inventoryReportRepo = new PrismaInventoryReportRepository(prisma);
const paymentReportRepo = new PrismaPaymentReportRepository(prisma);

const stockUseCase = new GetInventoryStockReportUseCase(inventoryReportRepo);
const paymentUseCase = new GetPaymentHistoryReportUseCase(paymentReportRepo);

export const reportsController = new ReportsController(
  stockUseCase,
  paymentUseCase,
  rbacContainer.authorizationService
);
