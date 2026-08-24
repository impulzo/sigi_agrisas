import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaPaymentRepository } from "../repositories/PrismaPaymentRepository";
import { RegisterPaymentUseCase } from "../../application/use-cases/RegisterPaymentUseCase";
import { CancelPaymentUseCase } from "../../application/use-cases/CancelPaymentUseCase";
import { ListPaymentsUseCase } from "../../application/use-cases/ListPaymentsUseCase";
import { GetPaymentUseCase } from "../../application/use-cases/GetPaymentUseCase";
import { ListPaymentsBySaleUseCase } from "../../application/use-cases/ListPaymentsBySaleUseCase";
import { GetPaymentHistoryReportUseCase } from "../../application/use-cases/GetPaymentHistoryReportUseCase";
import { PaymentsController } from "../http/PaymentsController";
import { rbacContainer } from "@/modules/rbac/infrastructure/di/container";
import { PrismaTicketSettingsRepository } from "@/modules/settings/infrastructure/repositories/PrismaTicketSettingsRepository";
import { GetTicketSettingsUseCase } from "@/modules/settings/application/use-cases/GetTicketSettingsUseCase";

const paymentRepo = new PrismaPaymentRepository(prisma);
const ticketSettingsRepo = new PrismaTicketSettingsRepository(prisma);

const registerUseCase = new RegisterPaymentUseCase(paymentRepo);
const cancelUseCase = new CancelPaymentUseCase(paymentRepo);
const listUseCase = new ListPaymentsUseCase(paymentRepo);
const getUseCase = new GetPaymentUseCase(paymentRepo);
const listBySaleUseCase = new ListPaymentsBySaleUseCase(paymentRepo);
const historyUseCase = new GetPaymentHistoryReportUseCase(paymentRepo);
const getTicketSettingsUseCase = new GetTicketSettingsUseCase(ticketSettingsRepo);

export const paymentsController = new PaymentsController(
  registerUseCase,
  cancelUseCase,
  listUseCase,
  getUseCase,
  listBySaleUseCase,
  historyUseCase,
  rbacContainer.authorizationService,
  getTicketSettingsUseCase
);
