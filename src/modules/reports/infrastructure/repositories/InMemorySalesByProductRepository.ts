import { SalesByProductRepository } from "../../application/ports/SalesByProductRepository";
import { SalesByProductFilters, SalesByProductAggregates } from "../../domain/value-objects/SalesByProductFilters";

export class InMemorySalesByProductRepository implements SalesByProductRepository {
  constructor(
    private readonly fixture: (filters: SalesByProductFilters) => SalesByProductAggregates
  ) {}

  async getAggregates(filters: SalesByProductFilters): Promise<SalesByProductAggregates> {
    return this.fixture(filters);
  }
}
