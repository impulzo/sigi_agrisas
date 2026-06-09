import { SaleItemInput } from "./CreateSaleRequest";

export interface EditCompletedSaleRequest {
  customerId?: string;
  paymentMethodId?: string;
  notes?: string | null;
  items: SaleItemInput[];
}
