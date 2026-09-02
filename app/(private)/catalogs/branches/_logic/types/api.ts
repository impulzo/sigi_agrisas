export interface BranchDto {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  addressStreet: string | null;
  addressExteriorNumber: string | null;
  addressInteriorNumber: string | null;
  addressNeighborhood: string | null;
  addressMunicipality: string | null;
  addressState: string | null;
  addressCountry: string | null;
  addressZipCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListBranchesResponse {
  items: BranchDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateBranchBody {
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
  addressStreet?: string | null;
  addressExteriorNumber?: string | null;
  addressInteriorNumber?: string | null;
  addressNeighborhood?: string | null;
  addressMunicipality?: string | null;
  addressState?: string | null;
  addressCountry?: string | null;
  addressZipCode?: string | null;
}

export interface UpdateBranchBody {
  name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
  addressStreet?: string | null;
  addressExteriorNumber?: string | null;
  addressInteriorNumber?: string | null;
  addressNeighborhood?: string | null;
  addressMunicipality?: string | null;
  addressState?: string | null;
  addressCountry?: string | null;
  addressZipCode?: string | null;
}
