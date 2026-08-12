import { SalesByProductFilters, SalesByProductPage } from "../../domain/value-objects/SalesByProductFilters";

export interface SalesByProductRepository {
  getPage(filters: SalesByProductFilters, page: number, pageSize: number): Promise<SalesByProductPage>;
}
