import { ReturnRepository } from "../ports/ReturnRepository";
import { ReturnDetailDto } from "../dto/ReturnDto";
import { toReturnDetailDto } from "../mappers/toReturnDto";

export class ListReturnsBySaleUseCase {
  constructor(private readonly returnRepo: ReturnRepository) {}

  async execute(saleId: string): Promise<ReturnDetailDto[]> {
    const results = await this.returnRepo.findBySaleId(saleId);
    return results.map(({ return: ret, items, joined }) =>
      toReturnDetailDto(ret, items, joined)
    );
  }
}
