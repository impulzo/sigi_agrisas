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
      initialBalance: req.initialBalance ?? 0,
      creditDays: req.creditDays ?? 30,
      isActive: req.isActive ?? true,
      addressStreet: req.addressStreet ?? null,
      addressExteriorNumber: req.addressExteriorNumber ?? null,
      addressInteriorNumber: req.addressInteriorNumber ?? null,
      addressNeighborhood: req.addressNeighborhood ?? null,
      addressMunicipality: req.addressMunicipality ?? null,
      addressState: req.addressState ?? null,
      addressCountry: req.addressCountry ?? "MEX",
      addressZipCode: req.addressZipCode ?? null,
    });
    return toCustomerDto(c);
  }
}
