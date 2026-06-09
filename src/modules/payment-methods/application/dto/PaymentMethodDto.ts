import { PaymentMethod } from "@/modules/payment-methods/domain/entities/PaymentMethod";

export interface PaymentMethodDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isCredit: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toPaymentMethodDto(pm: PaymentMethod): PaymentMethodDto {
  return {
    id: pm.id,
    code: pm.code,
    name: pm.name,
    description: pm.description,
    isCredit: pm.isCredit,
    isActive: pm.isActive,
    createdAt: pm.createdAt,
    updatedAt: pm.updatedAt,
  };
}
