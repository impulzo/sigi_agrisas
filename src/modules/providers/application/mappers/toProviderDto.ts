import { Provider } from "../../domain/entities/Provider";
import { ProviderDto } from "../dto/ProviderDto";

export function toProviderDto(provider: Provider): ProviderDto {
  return {
    id: provider.id,
    code: provider.code,
    name: provider.name,
    rfc: provider.rfc,
    legalName: provider.legalName,
    taxRegime: provider.taxRegime,
    cfdiUse: provider.cfdiUse,
    taxZipCode: provider.taxZipCode,
    email: provider.email,
    phone: provider.phone,
    address: provider.address,
    contactName: provider.contactName,
    notes: provider.notes,
    isActive: provider.isActive,
    createdAt: provider.createdAt.toISOString(),
    updatedAt: provider.updatedAt.toISOString(),
  };
}
