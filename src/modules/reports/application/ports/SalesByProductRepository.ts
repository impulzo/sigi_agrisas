import { SalesByProductFilters, SalesByProductAggregates } from "../../domain/value-objects/SalesByProductFilters";

export interface SalesByProductRepository {
  getAggregates(filters: SalesByProductFilters): Promise<SalesByProductAggregates>;
}
