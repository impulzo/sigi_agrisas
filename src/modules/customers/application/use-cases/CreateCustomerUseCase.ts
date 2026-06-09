import { CustomerRepository } from "../ports/CustomerRepository";
import { CreateCustomerRequest } from "../dto/CreateCustomerRequest";
import { CustomerDto } from "../dto/CustomerDto";
import { toCustomerDto } from "../mappers/toCustomerDto";

export class CreateCustomerUseCase {
  constructor(private readonly repo: CustomerRepository) {}

  async execute(req: CreateCustomerRequest): Promise<CustomerDto> {
    const c = await this.repo.create({
      code: req.code,
      name: req.name,
      rfc: req.rfc,
      legalName: req.legalName ?? null,
      taxRegime: req.taxRegime ?? null,
      cfdiUse: req.cfdiUse ?? null,
      taxZipCode: req.taxZipCode ?? null,
      email: req.email ?? null,
      phone: req.phone ?? null,
      address: req.address ?? null,
      contactName: req.contactName ?? null,
      notes: req.notes ?? null,
      creditLimit: req.creditLimit ?? null,
      isActive: req.isActive ?? true,
    });
    return toCustomerDto(c);
  }
}
