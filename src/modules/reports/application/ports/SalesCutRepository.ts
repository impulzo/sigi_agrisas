import { SalesCutFilters, SalesCutAggregates } from "../../domain/value-objects/SalesCutFilters";

export interface SalesCutRepository {
  getAggregates(filters: SalesCutFilters): Promise<SalesCutAggregates>;
}
