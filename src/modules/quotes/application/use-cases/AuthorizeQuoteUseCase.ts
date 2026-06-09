import { QuoteRepository } from "../ports/QuoteRepository";
import { AuthorizeQuoteRequest } from "../dto/AuthorizeQuoteRequest";
import { QuoteDetailDto } from "../dto/QuoteDto";
import { toQuoteDetailDto } from "../mappers/toQuoteDto";
import { QuoteNotFoundError } from "../../domain/errors/QuoteNotFoundError";
import { QuoteAlreadyAuthorizedError } from "../../domain/errors/QuoteAlreadyAuthorizedError";
import { QuoteExpiredError } from "../../domain/errors/QuoteExpiredError";

export interface AuthorizeQuoteResult {
  dto: QuoteDetailDto;
  branchId: string;
}

export class AuthorizeQuoteUseCase {
  constructor(private readonly repo: QuoteRepository) {}

  async execute(
    id: string,
    req: AuthorizeQuoteRequest,
    userId: string
  ): Promise<AuthorizeQuoteResult> {
    const existing = await this.repo.findByIdWithItems(id);
    if (!existing) throw new QuoteNotFoundError(id);
    if (existing.quote.status !== "draft") {
      throw new QuoteAlreadyAuthorizedError(existing.quote.status);
    }
    if (existing.quote.expiresAt && existing.quote.expiresAt < new Date()) {
      throw new QuoteExpiredError();
    }

    const summary = await this.repo.markAuthorized(id, userId, req.notes ?? null);
    return {
      dto: toQuoteDetailDto(summary.quote, summary.joined),
      branchId: summary.quote.branchId,
    };
  }
}
