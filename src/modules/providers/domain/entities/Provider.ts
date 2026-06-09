export interface ProviderProps {
  id: string;
  code: string;
  name: string;
  rfc: string;
  legalName: string | null;
  taxRegime: string | null;
  cfdiUse: string | null;
  taxZipCode: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactName: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Provider {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly rfc: string;
  readonly legalName: string | null;
  readonly taxRegime: string | null;
  readonly cfdiUse: string | null;
  readonly taxZipCode: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly address: string | null;
  readonly contactName: string | null;
  readonly notes: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: ProviderProps) {
    this.id = props.id;
    this.code = props.code;
    this.name = props.name;
    this.rfc = props.rfc;
    this.legalName = props.legalName;
    this.taxRegime = props.taxRegime;
    this.cfdiUse = props.cfdiUse;
    this.taxZipCode = props.taxZipCode;
    this.email = props.email;
    this.phone = props.phone;
    this.address = props.address;
    this.contactName = props.contactName;
    this.notes = props.notes;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: ProviderProps): Provider {
    return new Provider(props);
  }
}
