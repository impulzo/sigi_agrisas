export interface SaleForBilling {
  id: string;
  status: string;
  branchId: string;
  customerId: string | null;
  paymentMethodId: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  items: Array<{
    id: string;
    productId: string;
    productCodeSnapshot: string;
    productNameSnapshot: string;
    satProductCode: string | null;
    quantity: number;
    unitPrice: number;
    discountPct: number | null;
    ivaRate: number | null;
    iepsRate: number | null;
    lineSubtotal: number;
    lineTotal: number;
  }>;
}

export interface CustomerForBilling {
  id: string;
  name: string;
  legalName: string | null;
  rfc: string;
  taxRegime: string | null;
  cfdiUse: string | null;
  taxZipCode: string | null;
}

export interface BranchForBilling {
  id: string;
  code: string;
  name: string;
  address: string | null;
}

export interface BillingLookupService {
  findSaleWithItems(saleId: string): Promise<SaleForBilling | null>;
  findCustomer(customerId: string): Promise<CustomerForBilling | null>;
  findBranch(branchId: string): Promise<BranchForBilling | null>;
}
