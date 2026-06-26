import { TaxRateRepository } from "../ports/TaxRateRepository";
import { TaxRateDto, toTaxRateDto } from "../dto/TaxRateDto";
import { TaxRateNotFoundError } from "../../domain/errors";

export class GetTaxRateUseCase {
  constructor(private readonly repo: TaxRateRepository) {}

  async execute(id: string): Promise<TaxRateDto> {
    const taxRate = await this.repo.findById(id);
    if (!taxRate) throw new TaxRateNotFoundError();
    return toTaxRateDto(taxRate);
  }
}
