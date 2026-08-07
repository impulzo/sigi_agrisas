import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaSatCodeRepository } from "../repositories/PrismaSatCodeRepository";
import { PrismaSatTaxRegimeRepository } from "../repositories/PrismaSatTaxRegimeRepository";
import { PrismaSatCfdiUseRepository } from "../repositories/PrismaSatCfdiUseRepository";
import { SearchSatCodesUseCase } from "../../application/use-cases/SearchSatCodesUseCase";
import { SearchSatTaxRegimesUseCase } from "../../application/use-cases/SearchSatTaxRegimesUseCase";
import { SearchSatCfdiUsesUseCase } from "../../application/use-cases/SearchSatCfdiUsesUseCase";
import { SatCodesController } from "../http/SatCodesController";
import { SatTaxRegimesController } from "../http/SatTaxRegimesController";
import { SatCfdiUsesController } from "../http/SatCfdiUsesController";

const repo = new PrismaSatCodeRepository(prisma);
const taxRegimeRepo = new PrismaSatTaxRegimeRepository(prisma);
const cfdiUseRepo = new PrismaSatCfdiUseRepository(prisma);

export const satCodesController = new SatCodesController(new SearchSatCodesUseCase(repo));
export const satTaxRegimesController = new SatTaxRegimesController(
  new SearchSatTaxRegimesUseCase(taxRegimeRepo)
);
export const satCfdiUsesController = new SatCfdiUsesController(
  new SearchSatCfdiUsesUseCase(cfdiUseRepo)
);
