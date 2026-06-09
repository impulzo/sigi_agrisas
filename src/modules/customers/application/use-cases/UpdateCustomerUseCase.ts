import { CustomerRepository } from "../ports/CustomerRepository";
import { UpdateCustomerRequest } from "../dto/UpdateCustomerRequest";
import { CustomerDto } from "../dto/CustomerDto";
import { toCustomerDto } from "../mappers/toCustomerDto";

export class UpdateCustomerUseCase {
  constructor(private readonly repo: CustomerRepository) {}

  async execute(id: string, req: UpdateCustomerRequest): Promise<CustomerDto> {
    const c = await this.repo.update(id, req);
    return toCustomerDto(c);
  }
}
