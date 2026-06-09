import { QuoteRepository } from "../ports/QuoteRepository";
import { QuoteDetailDto } from "../dto/QuoteDto";
import { toQuoteDetailDto } from "../mappers/toQuoteDto";
import { QuoteNotFoundError } from "../../domain/errors/QuoteNotFoundError";

export interface GetQuoteResult {
  dto: QuoteDetailDto;
  branchId: string;
}

export class GetQuoteUseCase {
  constructor(private readonly repo: QuoteRepository) {}

  async execute(id: string): Promise<GetQuoteResult> {
    const summary = await this.repo.findByIdWithItems(id);
    if (!summary) throw new QuoteNotFoundError(id);
    return {
      dto: toQuoteDetailDto(summary.quote, summary.joined),
      branchId: summary.quote.branchId,
    };
  }
}
