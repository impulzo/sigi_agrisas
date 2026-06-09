import { QuoteRepository } from "../ports/QuoteRepository";
import { ListQuotesRequest } from "../dto/ListQuotesRequest";
import { ListQuotesResponse } from "../dto/ListQuotesResponse";
import { toQuoteDto } from "../mappers/toQuoteDto";

export class ListQuotesUseCase {
  constructor(private readonly repo: QuoteRepository) {}

  async execute(req: ListQuotesRequest): Promise<ListQuotesResponse> {
    const { items, total } = await this.repo.findAll(req);
    const now = new Date();
    return {
      items: items.map(({ quote, joined }) => toQuoteDto(quote, joined, now)),
      total,
      page: req.page,
      pageSize: req.pageSize,
    };
  }
}
