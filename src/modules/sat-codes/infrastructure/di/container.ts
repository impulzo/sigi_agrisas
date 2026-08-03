import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaSatCodeRepository } from "../repositories/PrismaSatCodeRepository";
import { SearchSatCodesUseCase } from "../../application/use-cases/SearchSatCodesUseCase";
import { SatCodesController } from "../http/SatCodesController";

const repo = new PrismaSatCodeRepository(prisma);

export const satCodesController = new SatCodesController(new SearchSatCodesUseCase(repo));
