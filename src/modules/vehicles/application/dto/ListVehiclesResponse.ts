import { VehicleDto } from "./VehicleDto";

export interface ListVehiclesResponse {
  items: VehicleDto[];
  total: number;
  page: number;
  pageSize: number;
}
