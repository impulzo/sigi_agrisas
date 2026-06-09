import { SaleItemDto } from "./SaleItemDto";

export interface SaleDto {
  id: string;
  folioId: string;
  folioCode: string;
  folioNumber: number;
  branchId: string;
  branchName: string | null;
  customerId: string | null;
  customerName: string | null;
  customerRfc: string | null;
  cashierId: string;
  cashierName: string | null;
  paymentMethodId: string;
  paymentMethodCode: string | null;
  isCredit: boolean;
  quoteId: string | null;
  status: string;
  paidAmount: string;
  paymentStatus: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  notes: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaleDetailDto extends SaleDto {
  items: SaleItemDto[];
  returnedQuantityBySaleItem: Record<string, number>;
}
