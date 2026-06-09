import { CustomerRepository } from "../ports/CustomerRepository";

export class SoftDeleteCustomerUseCase {
  constructor(private readonly repo: CustomerRepository) {}

  async execute(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}
