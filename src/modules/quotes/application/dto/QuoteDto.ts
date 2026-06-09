import { QuoteItemDto } from "./QuoteItemDto";

export interface QuoteDto {
  id: string;
  folioId: string;
  folioCode: string;
  folioNumber: number;
  branchId: string;
  branchName: string | null;
  customerId: string | null;
  customerName: string | null;
  customerRfc: string | null;
  creatorId: string;
  creatorName: string | null;
  status: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  notes: string | null;
  expiresAt: string | null;
  authorizedAt: string | null;
  authorizedBy: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  convertedAt: string | null;
  convertedSaleId: string | null;
  isExpired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteDetailDto extends QuoteDto {
  items: QuoteItemDto[];
}
