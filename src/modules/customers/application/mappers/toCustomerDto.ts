import { Customer } from "../../domain/entities/Customer";
import { CustomerDto } from "../dto/CustomerDto";

export function toCustomerDto(c: Customer): CustomerDto {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    rfc: c.rfc,
    legalName: c.legalName,
    taxRegime: c.taxRegime,
    cfdiUse: c.cfdiUse,
    taxZipCode: c.taxZipCode,
    email: c.email,
    phone: c.phone,
    address: c.address,
    contactName: c.contactName,
    notes: c.notes,
    creditLimit: c.creditLimit,
    currentBalance: c.currentBalance,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}
