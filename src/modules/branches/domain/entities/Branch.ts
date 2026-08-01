export interface BranchProps {
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

export class Branch {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly address: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly isHeadquarters: boolean;
  readonly isActive: boolean;
  readonly addressStreet: string | null;
  readonly addressExteriorNumber: string | null;
  readonly addressInteriorNumber: string | null;
  readonly addressNeighborhood: string | null;
  readonly addressMunicipality: string | null;
  readonly addressState: string | null;
  readonly addressCountry: string | null;
  readonly addressZipCode: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(id: string, props: BranchProps) {
    this.id = id;
    this.code = props.code;
    this.name = props.name;
    this.address = props.address;
    this.phone = props.phone;
    this.email = props.email;
    this.isHeadquarters = props.isHeadquarters;
    this.isActive = props.isActive;
    this.addressStreet = props.addressStreet;
    this.addressExteriorNumber = props.addressExteriorNumber;
    this.addressInteriorNumber = props.addressInteriorNumber;
    this.addressNeighborhood = props.addressNeighborhood;
    this.addressMunicipality = props.addressMunicipality;
    this.addressState = props.addressState;
    this.addressCountry = props.addressCountry;
    this.addressZipCode = props.addressZipCode;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(id: string, props: BranchProps): Branch {
    return new Branch(id, props);
  }
}
