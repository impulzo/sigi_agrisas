import { TaxRateRepository } from "../ports/TaxRateRepository";
import { TaxRateDto, toTaxRateDto } from "../dto/TaxRateDto";
import { TaxRateNotFoundError, TaxRateInUseByProductsError } from "../../domain/errors";

export class DeactivateTaxRateUseCase {
  constructor(private readonly repo: TaxRateRepository) {}

  async execute(id: string): Promise<TaxRateDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new TaxRateNotFoundError();
    const count = await this.repo.findActiveProductCount(id);
    if (count > 0) throw new TaxRateInUseByProductsError(count);
    const updated = await this.repo.update(id, { isActive: false });
    return toTaxRateDto(updated);
  }
}
