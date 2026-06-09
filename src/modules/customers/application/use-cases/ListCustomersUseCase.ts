import { CustomerRepository } from "../ports/CustomerRepository";
import { ListCustomersRequest } from "../dto/ListCustomersRequest";
import { ListCustomersResponse } from "../dto/ListCustomersResponse";
import { toCustomerDto } from "../mappers/toCustomerDto";

export class ListCustomersUseCase {
  constructor(private readonly repo: CustomerRepository) {}

  async execute(req: ListCustomersRequest): Promise<ListCustomersResponse> {
    const { items, total } = await this.repo.findAll(req);
    return {
      items: items.map(toCustomerDto),
      total,
      page: req.page,
      pageSize: req.pageSize,
    };
  }
}
