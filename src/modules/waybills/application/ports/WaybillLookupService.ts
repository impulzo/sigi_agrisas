export interface BranchForWaybill {
  id: string;
  name: string;
  isActive: boolean;
  addressStreet: string | null;
  addressExteriorNumber: string | null;
  addressInteriorNumber: string | null;
  addressNeighborhood: string | null;
  addressMunicipality: string | null;
  addressState: string | null;
  addressCountry: string | null;
  addressZipCode: string | null;
}

export interface ProductForWaybill {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface FolioForWaybill {
  id: string;
  isActive: boolean;
}

export interface WaybillLookupService {
  findBranch(branchId: string): Promise<BranchForWaybill | null>;
  findProduct(productId: string): Promise<ProductForWaybill | null>;
  findFolioByCode(code: string): Promise<FolioForWaybill | null>;
}
