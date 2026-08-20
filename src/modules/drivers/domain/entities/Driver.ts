export interface DriverProps {
  id: string;
  code: string;
  name: string;
  rfc: string | null;
  licenseNumber: string;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Driver {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly rfc: string | null;
  readonly licenseNumber: string;
  readonly notes: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: DriverProps) {
    this.id = props.id;
    this.code = props.code;
    this.name = props.name;
    this.rfc = props.rfc;
    this.licenseNumber = props.licenseNumber;
    this.notes = props.notes;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: DriverProps): Driver {
    return new Driver(props);
  }
}
