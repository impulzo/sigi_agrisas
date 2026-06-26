export interface TaxRate {
  id: string;
  code: string;
  name: string;
  description: string | null;
  rate: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
