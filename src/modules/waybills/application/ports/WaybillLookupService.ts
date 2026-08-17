/** Common shape for a physical address source usable to build a Carta Porte `Ubicacion` node. */
export interface AddressSource {
  addressStreet: string | null;
  addressExteriorNumber: string | null;
  addressInteriorNumber: string | null;
  addressNeighborhood: string | null;
  addressMunicipality: string | null;
  addressState: string | null;
  addressCountry: string | null;
  addressZipCode: string | null;
}

export interface BranchForWaybill extends AddressSource {
  id: string;
  name: string;
  isActive: boolean;
}

export interface CustomerForWaybill extends AddressSource {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
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

export interface SaleItemForWaybill {
  productId: string | null;
  quantity: number;
  productNameSnapshot: string;
}

export interface SaleForWaybill {
  id: string;
  branchId: string;
  customerId: string | null;
  status: string;
  items: SaleItemForWaybill[];
}

export interface WaybillLookupService {
  findBranch(branchId: string): Promise<BranchForWaybill | null>;
  findProduct(productId: string): Promise<ProductForWaybill | null>;
  findFolioByCode(code: string): Promise<FolioForWaybill | null>;
  findSale(saleId: string): Promise<SaleForWaybill | null>;
  findCustomer(customerId: string): Promise<CustomerForWaybill | null>;
}
