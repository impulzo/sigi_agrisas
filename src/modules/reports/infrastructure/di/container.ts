import { prisma } from "@/shared/infrastructure/prisma/client";
import { rbacContainer } from "@/modules/rbac/infrastructure/di/container";
import { PrismaPurchaseRepository } from "@/modules/purchases/infrastructure/repositories/PrismaPurchaseRepository";
import { PrismaInventoryReportRepository } from "../repositories/PrismaInventoryReportRepository";
import { PrismaDepartmentPriceListRepository } from "../repositories/PrismaDepartmentPriceListRepository";
import { PrismaPaymentReportRepository } from "../repositories/PrismaPaymentReportRepository";
import { PrismaAccountStatementRepository } from "../repositories/PrismaAccountStatementRepository";
import { PrismaSalesCutRepository } from "../repositories/PrismaSalesCutRepository";
import { PrismaCashCutRepository } from "../repositories/PrismaCashCutRepository";
import { PrismaProviderPaymentReportRepository } from "../repositories/PrismaProviderPaymentReportRepository";
import { PrismaSalesByProductRepository } from "../repositories/PrismaSalesByProductRepository";
import { GetInventoryStockReportUseCase } from "../../application/use-cases/GetInventoryStockReportUseCase";
import { GetPaymentHistoryReportUseCase } from "../../application/use-cases/GetPaymentHistoryReportUseCase";
import { GetAccountStatementsSummaryUseCase } from "../../application/use-cases/GetAccountStatementsSummaryUseCase";
import { GetAccountStatementLedgerUseCase } from "../../application/use-cases/GetAccountStatementLedgerUseCase";
import { GetAnticipoReceiptUseCase } from "../../application/use-cases/GetAnticipoReceiptUseCase";
import { GetSalesCutReportUseCase } from "../../application/use-cases/GetSalesCutReportUseCase";
import { GetCashCutReportUseCase } from "../../application/use-cases/GetCashCutReportUseCase";
import { GetDepartmentPriceListReportUseCase } from "../../application/use-cases/GetDepartmentPriceListReportUseCase";
import { GetPurchasesReportUseCase } from "../../application/use-cases/GetPurchasesReportUseCase";
import { GetProviderPaymentsReportUseCase } from "../../application/use-cases/GetProviderPaymentsReportUseCase";
import { GetSalesByProductReportUseCase } from "../../application/use-cases/GetSalesByProductReportUseCase";
import { GetCollectionsReportUseCase } from "../../application/use-cases/GetCollectionsReportUseCase";
import { ReportsController } from "../http/ReportsController";
import { PrismaTicketSettingsRepository } from "@/modules/settings/infrastructure/repositories/PrismaTicketSettingsRepository";
import { GetTicketSettingsUseCase } from "@/modules/settings/application/use-cases/GetTicketSettingsUseCase";

const inventoryReportRepo = new PrismaInventoryReportRepository(prisma);
const departmentPriceListRepo = new PrismaDepartmentPriceListRepository(prisma);
const paymentReportRepo = new PrismaPaymentReportRepository(prisma);
const accountStatementRepo = new PrismaAccountStatementRepository(prisma);
const salesCutRepo = new PrismaSalesCutRepository(prisma);
const cashCutRepo = new PrismaCashCutRepository(prisma);
const providerPaymentReportRepo = new PrismaProviderPaymentReportRepository(prisma);
const salesByProductRepo = new PrismaSalesByProductRepository(prisma);
// Instanciado localmente (no importado de purchases/di) para evitar ciclo de imports,
// mismo patrón que pos/di con PrismaQuoteRepository — ver design.md D1.
const purchaseRepo = new PrismaPurchaseRepository(prisma);

const stockUseCase = new GetInventoryStockReportUseCase(inventoryReportRepo);
const paymentUseCase = new GetPaymentHistoryReportUseCase(paymentReportRepo);
const accountSummaryUseCase = new GetAccountStatementsSummaryUseCase(accountStatementRepo);
const accountLedgerUseCase = new GetAccountStatementLedgerUseCase(accountStatementRepo);
const anticipoReceiptUseCase = new GetAnticipoReceiptUseCase(accountStatementRepo);
const salesCutUseCase = new GetSalesCutReportUseCase(salesCutRepo);
const cashCutUseCase = new GetCashCutReportUseCase(cashCutRepo);
const departmentPriceListUseCase = new GetDepartmentPriceListReportUseCase(departmentPriceListRepo);
const purchasesUseCase = new GetPurchasesReportUseCase(purchaseRepo);
const providerPaymentsUseCase = new GetProviderPaymentsReportUseCase(providerPaymentReportRepo);
const salesByProductUseCase = new GetSalesByProductReportUseCase(salesByProductRepo);
const collectionsUseCase = new GetCollectionsReportUseCase(cashCutRepo);
const getTicketSettingsUseCase = new GetTicketSettingsUseCase(new PrismaTicketSettingsRepository(prisma));

export const reportsController = new ReportsController(
  stockUseCase,
  paymentUseCase,
  accountSummaryUseCase,
  accountLedgerUseCase,
  anticipoReceiptUseCase,
  salesCutUseCase,
  cashCutUseCase,
  departmentPriceListUseCase,
  purchasesUseCase,
  providerPaymentsUseCase,
  salesByProductUseCase,
  collectionsUseCase,
  rbacContainer.authorizationService,
  getTicketSettingsUseCase
);
