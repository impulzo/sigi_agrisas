export interface SalesByProductDetailRowDto {
  departmentId: string;
  departmentName: string;
  productId: string;
  productCode: string;
  productName: string;
  customerId: string | null;
  customerName: string;
  quantity: string;
  total: string;
}

export interface SalesByProductReportDto {
  generatedAt: string;
  generatedBy: { userId: string; email: string };
  filters: {
    branchId: string | null;
    departmentId: string | null;
    customerId: string | null;
    from: string;
    to: string;
  };
  totals: {
    ticketCount: number;
    subtotal: string;
    taxTotal: string;
    total: string;
  };
  rows: SalesByProductDetailRowDto[];
  rowsTotal: number;
}
