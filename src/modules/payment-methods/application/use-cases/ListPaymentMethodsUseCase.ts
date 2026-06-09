import { PaymentMethodRepository } from "@/modules/payment-methods/application/ports/PaymentMethodRepository";
import { PaymentMethodDto, toPaymentMethodDto } from "@/modules/payment-methods/application/dto/PaymentMethodDto";

export interface ListPaymentMethodsRequest {
  page: number;
  pageSize: number;
  includeInactive: boolean;
}

export interface ListPaymentMethodsResponse {
  items: PaymentMethodDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class ListPaymentMethodsUseCase {
  constructor(private readonly repo: PaymentMethodRepository) {}

  async execute(req: ListPaymentMethodsRequest): Promise<ListPaymentMethodsResponse> {
    const { items, total } = await this.repo.findAll(req);
    return { items: items.map(toPaymentMethodDto), total, page: req.page, pageSize: req.pageSize };
  }
}
