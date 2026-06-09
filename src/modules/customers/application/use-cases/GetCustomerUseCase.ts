import { CustomerRepository } from "../ports/CustomerRepository";
import { CustomerDto } from "../dto/CustomerDto";
import { toCustomerDto } from "../mappers/toCustomerDto";
import { CustomerNotFoundError } from "../../domain/errors/CustomerNotFoundError";

export class GetCustomerUseCase {
  constructor(private readonly repo: CustomerRepository) {}

  async execute(id: string): Promise<CustomerDto> {
    const c = await this.repo.findById(id);
    if (!c) throw new CustomerNotFoundError(id);
    return toCustomerDto(c);
  }
}
