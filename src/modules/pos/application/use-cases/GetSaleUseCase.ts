import { SaleRepository } from "../ports/SaleRepository";
import { SaleDetailDto } from "../dto/SaleDto";
import { toSaleDetailDto } from "../mappers/toSaleDto";
import { SaleNotFoundError } from "../../domain/errors/SaleNotFoundError";

export interface GetSaleResult {
  dto: SaleDetailDto;
  branchId: string;
}

export class GetSaleUseCase {
  constructor(private readonly repo: SaleRepository) {}

  async execute(id: string): Promise<GetSaleResult> {
    const summary = await this.repo.findByIdWithItems(id);
    if (!summary) throw new SaleNotFoundError(id);
    return {
      dto: toSaleDetailDto(summary.sale, summary.joined, summary.returnedQuantityBySaleItem ?? {}),
      branchId: summary.sale.branchId,
    };
  }
}
