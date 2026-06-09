export interface ProductLookup {
  id: string;
  code: string;
  name: string;
  ivaRate: number | null;
  iepsRate: number | null;
  isActive: boolean;
}

export interface ProductPriceLookup {
  id: string;
  productId: string;
  name: string;
  price: number;
  discountPct: number | null;
}

export interface CustomerLookup {
  id: string;
  isActive: boolean;
  creditLimit: number | null;
  currentBalance: number;
}

export interface BranchLookup {
  id: string;
  isActive: boolean;
}

export interface FolioLookup {
  id: string;
  code: string;
  prefix: string | null;
  isActive: boolean;
}

export interface PaymentMethodLookup {
  id: string;
  isActive: boolean;
  isCredit: boolean;
}

export interface PosLookupService {
  getProduct(id: string): Promise<ProductLookup | null>;
  getProductPrice(id: string): Promise<ProductPriceLookup | null>;
  getCustomer(id: string): Promise<CustomerLookup | null>;
  getBranch(id: string): Promise<BranchLookup | null>;
  getFolio(id: string): Promise<FolioLookup | null>;
  getPaymentMethod(id: string): Promise<PaymentMethodLookup | null>;
}
