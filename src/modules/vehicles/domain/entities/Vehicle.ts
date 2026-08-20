export interface VehicleProps {
  id: string;
  code: string;
  plate: string;
  vehicleConfig: string;
  permitType: string;
  permitNumber: string;
  insuranceCompany: string;
  insurancePolicy: string;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Vehicle {
  readonly id: string;
  readonly code: string;
  readonly plate: string;
  readonly vehicleConfig: string;
  readonly permitType: string;
  readonly permitNumber: string;
  readonly insuranceCompany: string;
  readonly insurancePolicy: string;
  readonly notes: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: VehicleProps) {
    this.id = props.id;
    this.code = props.code;
    this.plate = props.plate;
    this.vehicleConfig = props.vehicleConfig;
    this.permitType = props.permitType;
    this.permitNumber = props.permitNumber;
    this.insuranceCompany = props.insuranceCompany;
    this.insurancePolicy = props.insurancePolicy;
    this.notes = props.notes;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: VehicleProps): Vehicle {
    return new Vehicle(props);
  }
}
