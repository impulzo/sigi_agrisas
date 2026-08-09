import { prisma } from "@/shared/infrastructure/prisma/client";
import { rbacContainer } from "@/modules/rbac/infrastructure/di/container";
import { PrismaInventoryReportRepository } from "../repositories/PrismaInventoryReportRepository";
import { PrismaDepartmentPriceListRepository } from "../repositories/PrismaDepartmentPriceListRepository";
import { PrismaPaymentReportRepository } from "../repositories/PrismaPaymentReportRepository";
import { PrismaAccountStatementRepository } from "../repositories/PrismaAccountStatementRepository";
import { PrismaSalesCutRepository } from "../repositories/PrismaSalesCutRepository";
import { PrismaCashCutRepository } from "../repositories/PrismaCashCutRepository";
import { GetInventoryStockReportUseCase } from "../../application/use-cases/GetInventoryStockReportUseCase";
import { GetPaymentHistoryReportUseCase } from "../../application/use-cases/GetPaymentHistoryReportUseCase";
import { GetAccountStatementsSummaryUseCase } from "../../application/use-cases/GetAccountStatementsSummaryUseCase";
import { GetAccountStatementLedgerUseCase } from "../../application/use-cases/GetAccountStatementLedgerUseCase";
import { GetAnticipoReceiptUseCase } from "../../application/use-cases/GetAnticipoReceiptUseCase";
import { GetSalesCutReportUseCase } from "../../application/use-cases/GetSalesCutReportUseCase";
import { GetCashCutReportUseCase } from "../../application/use-cases/GetCashCutReportUseCase";
import { GetDepartmentPriceListReportUseCase } from "../../application/use-cases/GetDepartmentPriceListReportUseCase";
import { ReportsController } from "../http/ReportsController";

const inventoryReportRepo = new PrismaInventoryReportRepository(prisma);
const departmentPriceListRepo = new PrismaDepartmentPriceListRepository(prisma);
const paymentReportRepo = new PrismaPaymentReportRepository(prisma);
const accountStatementRepo = new PrismaAccountStatementRepository(prisma);
const salesCutRepo = new PrismaSalesCutRepository(prisma);
const cashCutRepo = new PrismaCashCutRepository(prisma);

const stockUseCase = new GetInventoryStockReportUseCase(inventoryReportRepo);
const paymentUseCase = new GetPaymentHistoryReportUseCase(paymentReportRepo);
const accountSummaryUseCase = new GetAccountStatementsSummaryUseCase(accountStatementRepo);
const accountLedgerUseCase = new GetAccountStatementLedgerUseCase(accountStatementRepo);
const anticipoReceiptUseCase = new GetAnticipoReceiptUseCase(accountStatementRepo);
const salesCutUseCase = new GetSalesCutReportUseCase(salesCutRepo);
const cashCutUseCase = new GetCashCutReportUseCase(cashCutRepo);
const departmentPriceListUseCase = new GetDepartmentPriceListReportUseCase(departmentPriceListRepo);

export const reportsController = new ReportsController(
  stockUseCase,
  paymentUseCase,
  accountSummaryUseCase,
  accountLedgerUseCase,
  anticipoReceiptUseCase,
  salesCutUseCase,
  cashCutUseCase,
  departmentPriceListUseCase,
  rbacContainer.authorizationService
);
