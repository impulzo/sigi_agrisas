export interface CollectionsRowDto {
  paymentId: string;
  saleId: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  factura: string;
  amount: string;
  paymentMethodName: string;
  reference: string | null;
  collectedAt: string;
}

export interface CollectionsByCustomerRowDto {
  customerId: string;
  customerCode: string;
  customerName: string;
  count: number;
  total: string;
}

export interface CollectionsByTicketRowDto {
  saleId: string;
  factura: string;
  customerName: string;
  count: number;
  total: string;
}

export interface CollectionsReportResponseDto {
  generatedAt: string;
  generatedBy: { userId: string; email: string };
  filters: {
    branchId: string | null;
    customerId: string | null;
    from: string;
    to: string;
  };
  totals: { totalCollected: string };
  rows: CollectionsRowDto[];
  byCustomer: CollectionsByCustomerRowDto[];
  byTicket: CollectionsByTicketRowDto[];
}
