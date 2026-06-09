import type { QuoteDto, QuoteDetailDto } from "../types/api";
import type { Quote, QuoteDetail } from "../types/domain";

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  return new Date(s);
}

export function mapDtoToQuote(dto: QuoteDto): Quote {
  return {
    ...dto,
    expiresAt: parseDate(dto.expiresAt),
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export function mapDtoToQuoteDetail(dto: QuoteDetailDto): QuoteDetail {
  return {
    ...dto,
    expiresAt: parseDate(dto.expiresAt),
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    authorizedAt: parseDate(dto.authorizedAt),
    cancelledAt: parseDate(dto.cancelledAt),
    convertedAt: parseDate(dto.convertedAt),
  };
}
