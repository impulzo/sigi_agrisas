import { PaymentMethod } from "@/modules/payment-methods/domain/entities/PaymentMethod";

export interface FindAllOptions {
  page: number;
  pageSize: number;
  includeInactive: boolean;
}

export interface CreatePaymentMethodData {
  code: string;
  name: string;
  description?: string | null;
  isCredit?: boolean;
  isActive?: boolean;
}

export interface UpdatePaymentMethodData {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface PaymentMethodRepository {
  findAll(opts: FindAllOptions): Promise<{ items: PaymentMethod[]; total: number }>;
  findById(id: string): Promise<PaymentMethod | null>;
  create(data: CreatePaymentMethodData): Promise<PaymentMethod>;
  update(id: string, data: UpdatePaymentMethodData): Promise<PaymentMethod>;
  softDelete(id: string): Promise<void>;
}
