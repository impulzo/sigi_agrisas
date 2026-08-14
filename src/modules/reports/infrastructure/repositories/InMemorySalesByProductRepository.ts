import { SalesByProductRepository } from "../../application/ports/SalesByProductRepository";
import { SalesByProductFilters, SalesByProductPage } from "../../domain/value-objects/SalesByProductFilters";

export class InMemorySalesByProductRepository implements SalesByProductRepository {
  constructor(
    private readonly fixture: (
      filters: SalesByProductFilters,
      page: number,
      pageSize: number
    ) => SalesByProductPage
  ) {}

  async getPage(filters: SalesByProductFilters, page: number, pageSize: number): Promise<SalesByProductPage> {
    return this.fixture(filters, page, pageSize);
  }
}
