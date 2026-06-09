export interface BranchProps {
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isHeadquarters: boolean;
  isActive: boolean;
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
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(id: string, props: BranchProps): Branch {
    return new Branch(id, props);
  }
}
