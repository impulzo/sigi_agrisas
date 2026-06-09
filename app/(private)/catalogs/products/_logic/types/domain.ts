export interface Product {
  id: string;
  code: string;
  name: string;
  unit: string;
  satProductCode: string | null;
  departmentId: string;
  departmentName: string;
  ivaRate: number | null;
  iepsRate: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductPrice {
  id: string;
  productId: string;
  name: string;
  price: number;
  minQuantity: number;
  discountPct: number | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductDosification {
  id: string;
  productId: string;
  name: string;
  numParts: number;
  isActive: boolean;
  computedUnitPrice: number | null;
  requiresDefaultPrice: boolean;
  createdAt: Date;
  updatedAt: Date;
}
