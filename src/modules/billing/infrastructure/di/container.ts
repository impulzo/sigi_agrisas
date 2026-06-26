import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaInvoiceRepository } from "../repositories/PrismaInvoiceRepository";
import { PrismaBillingLookupService } from "../services/PrismaBillingLookupService";
import { FacturamaRestGateway } from "../services/FacturamaRestGateway";
import { FakeFacturamaGateway } from "../services/FakeFacturamaGateway";
import { StampInvoiceUseCase } from "../../application/use-cases/StampInvoiceUseCase";
import { CancelInvoiceUseCase } from "../../application/use-cases/CancelInvoiceUseCase";
import { DownloadInvoiceFileUseCase } from "../../application/use-cases/DownloadInvoiceFileUseCase";
import { ListInvoicesUseCase } from "../../application/use-cases/ListInvoicesUseCase";
import { GetInvoiceUseCase } from "../../application/use-cases/GetInvoiceUseCase";
import { ListInvoicesBySaleUseCase } from "../../application/use-cases/ListInvoicesBySaleUseCase";
import { UploadCsdUseCase } from "../../application/use-cases/UploadCsdUseCase";
import { GetCsdStatusUseCase } from "../../application/use-cases/GetCsdStatusUseCase";
import { BillingController } from "../http/BillingController";
import { rbacContainer } from "@/modules/rbac/infrastructure/di/container";
import type { FacturamaGateway } from "../../application/ports/FacturamaGateway";

const isMock = process.env.FACTURAMA_MOCK !== "false";
const gateway: FacturamaGateway = isMock
  ? new FakeFacturamaGateway()
  : new FacturamaRestGateway();

const invoiceRepo = new PrismaInvoiceRepository(prisma);
const lookupService = new PrismaBillingLookupService(prisma);

const stampUseCase = new StampInvoiceUseCase(invoiceRepo, gateway, lookupService);
const cancelUseCase = new CancelInvoiceUseCase(invoiceRepo, gateway);
const downloadUseCase = new DownloadInvoiceFileUseCase(invoiceRepo, gateway);
const listUseCase = new ListInvoicesUseCase(invoiceRepo);
const getUseCase = new GetInvoiceUseCase(invoiceRepo);
const listBySaleUseCase = new ListInvoicesBySaleUseCase(invoiceRepo);
const uploadCsdUseCase = new UploadCsdUseCase(gateway);
const getCsdStatusUseCase = new GetCsdStatusUseCase(gateway);

export const billingController = new BillingController(
  stampUseCase,
  cancelUseCase,
  downloadUseCase,
  listUseCase,
  getUseCase,
  listBySaleUseCase,
  uploadCsdUseCase,
  getCsdStatusUseCase,
  rbacContainer.authorizationService
);
