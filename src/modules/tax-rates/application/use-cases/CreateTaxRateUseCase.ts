import { TaxRateRepository } from "../ports/TaxRateRepository";
import { TaxRateDto, CreateTaxRateRequest, toTaxRateDto } from "../dto/TaxRateDto";
import { TaxRateCodeAlreadyInUseError } from "../../domain/errors";

export class CreateTaxRateUseCase {
  constructor(private readonly repo: TaxRateRepository) {}

  async execute(req: CreateTaxRateRequest): Promise<TaxRateDto> {
    const existing = await this.repo.findByCode(req.code);
    if (existing) throw new TaxRateCodeAlreadyInUseError();
    const taxRate = await this.repo.create({
      code: req.code.toUpperCase().trim(),
      name: req.name,
      description: req.description ?? null,
      rate: req.rate,
      isActive: req.isActive ?? true,
    });
    return toTaxRateDto(taxRate);
  }
}
