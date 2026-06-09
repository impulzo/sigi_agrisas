import { QuoteRepository } from "../ports/QuoteRepository";
import { CancelQuoteRequest } from "../dto/CancelQuoteRequest";
import { QuoteDetailDto } from "../dto/QuoteDto";
import { toQuoteDetailDto } from "../mappers/toQuoteDto";
import { QuoteNotFoundError } from "../../domain/errors/QuoteNotFoundError";
import { QuoteAlreadyCancelledError } from "../../domain/errors/QuoteAlreadyCancelledError";
import { QuoteAlreadyConvertedError } from "../../domain/errors/QuoteAlreadyConvertedError";

export interface CancelQuoteResult {
  dto: QuoteDetailDto;
  branchId: string;
}

export class CancelQuoteUseCase {
  constructor(private readonly repo: QuoteRepository) {}

  async execute(id: string, req: CancelQuoteRequest): Promise<CancelQuoteResult> {
    const existing = await this.repo.findByIdWithItems(id);
    if (!existing) throw new QuoteNotFoundError(id);
    if (existing.quote.status === "cancelled") throw new QuoteAlreadyCancelledError();
    if (existing.quote.status === "converted") {
      throw new QuoteAlreadyConvertedError(existing.quote.convertedSaleId ?? "");
    }

    const summary = await this.repo.markCancelled(id, req.reason ?? null);
    return {
      dto: toQuoteDetailDto(summary.quote, summary.joined),
      branchId: summary.quote.branchId,
    };
  }
}
