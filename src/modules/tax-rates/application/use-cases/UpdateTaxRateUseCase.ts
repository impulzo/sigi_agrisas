import { TaxRateRepository } from "../ports/TaxRateRepository";
import { TaxRateDto, UpdateTaxRateRequest, toTaxRateDto } from "../dto/TaxRateDto";
import { TaxRateNotFoundError } from "../../domain/errors";

export class UpdateTaxRateUseCase {
  constructor(private readonly repo: TaxRateRepository) {}

  async execute(id: string, req: UpdateTaxRateRequest): Promise<TaxRateDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new TaxRateNotFoundError();
    const updated = await this.repo.update(id, {
      name: req.name,
      description: req.description,
      rate: req.rate,
      isActive: req.isActive,
    });
    return toTaxRateDto(updated);
  }
}
