import { SaleRepository } from "../ports/SaleRepository";
import { CancelSaleRequest } from "../dto/CancelSaleRequest";
import { SaleDetailDto } from "../dto/SaleDto";
import { toSaleDetailDto } from "../mappers/toSaleDto";
import { SaleNotFoundError } from "../../domain/errors/SaleNotFoundError";

export interface CancelSaleResult {
  dto: SaleDetailDto;
  branchId: string;
}

export class CancelSaleUseCase {
  constructor(private readonly repo: SaleRepository) {}

  async execute(id: string, req: CancelSaleRequest): Promise<CancelSaleResult> {
    const existing = await this.repo.findByIdWithItems(id);
    if (!existing) throw new SaleNotFoundError(id);
    const summary = await this.repo.cancel(id, req.reason ?? null);
    return {
      dto: toSaleDetailDto(summary.sale, summary.joined),
      branchId: summary.sale.branchId,
    };
  }
}
