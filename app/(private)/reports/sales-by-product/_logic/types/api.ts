export interface SalesByProductBreakdownRowDto {
  key: string;
  label: string;
  ticketCount: number;
  subtotal: string;
  taxTotal: string;
  total: string;
}

export interface SalesByProductRowDto extends SalesByProductBreakdownRowDto {
  quantitySold: string;
  currentStock: number;
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
  byCustomer: SalesByProductBreakdownRowDto[];
  byDepartment: SalesByProductBreakdownRowDto[];
  byProduct: SalesByProductRowDto[];
}
