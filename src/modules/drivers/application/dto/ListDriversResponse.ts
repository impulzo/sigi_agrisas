import { DriverDto } from "./DriverDto";

export interface ListDriversResponse {
  items: DriverDto[];
  total: number;
  page: number;
  pageSize: number;
}
