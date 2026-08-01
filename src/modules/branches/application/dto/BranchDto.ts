import { Branch } from "@/modules/branches/domain/entities/Branch";

export interface BranchDto {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isHeadquarters: boolean;
  isActive: boolean;
  addressStreet: string | null;
  addressExteriorNumber: string | null;
  addressInteriorNumber: string | null;
  addressNeighborhood: string | null;
  addressMunicipality: string | null;
  addressState: string | null;
  addressCountry: string | null;
  addressZipCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toBranchDto(b: Branch): BranchDto {
  return {
    id: b.id,
    code: b.code,
    name: b.name,
    address: b.address,
    phone: b.phone,
    email: b.email,
    isHeadquarters: b.isHeadquarters,
    isActive: b.isActive,
    addressStreet: b.addressStreet,
    addressExteriorNumber: b.addressExteriorNumber,
    addressInteriorNumber: b.addressInteriorNumber,
    addressNeighborhood: b.addressNeighborhood,
    addressMunicipality: b.addressMunicipality,
    addressState: b.addressState,
    addressCountry: b.addressCountry,
    addressZipCode: b.addressZipCode,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}
