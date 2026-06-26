import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaTaxRateRepository } from "../repositories/PrismaTaxRateRepository";
import { ListTaxRatesUseCase } from "../../application/use-cases/ListTaxRatesUseCase";
import { GetTaxRateUseCase } from "../../application/use-cases/GetTaxRateUseCase";
import { CreateTaxRateUseCase } from "../../application/use-cases/CreateTaxRateUseCase";
import { UpdateTaxRateUseCase } from "../../application/use-cases/UpdateTaxRateUseCase";
import { DeactivateTaxRateUseCase } from "../../application/use-cases/DeactivateTaxRateUseCase";
import { TaxRatesController } from "../http/TaxRatesController";

const repo = new PrismaTaxRateRepository(prisma);

export const taxRatesController = new TaxRatesController(
  new ListTaxRatesUseCase(repo),
  new GetTaxRateUseCase(repo),
  new CreateTaxRateUseCase(repo),
  new UpdateTaxRateUseCase(repo),
  new DeactivateTaxRateUseCase(repo)
);
