import { TaxRateRepository, FindAllTaxRatesOptions } from "../ports/TaxRateRepository";
import { TaxRateDto, toTaxRateDto, ListTaxRatesResponse } from "../dto/TaxRateDto";

export class ListTaxRatesUseCase {
  constructor(private readonly repo: TaxRateRepository) {}

  async execute(options: FindAllTaxRatesOptions): Promise<ListTaxRatesResponse> {
    const { items, total } = await this.repo.findAll(options);
    return {
      items: items.map(toTaxRateDto),
      total,
      page: options.page,
      pageSize: options.pageSize,
    };
  }
}
