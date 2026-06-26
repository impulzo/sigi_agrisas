import { ProductRepository } from "../ports/ProductRepository";
import { DepartmentRepository } from "@/modules/departments/application/ports/DepartmentRepository";
import { TaxRateRepository } from "@/modules/tax-rates/application/ports/TaxRateRepository";
import { UpdateProductRequest } from "../dto/UpdateProductRequest";
import { ProductDto } from "../dto/ProductDto";
import { toProductDto } from "../mappers/toProductDto";
import { ProductDepartmentNotFoundError } from "../../domain/errors/ProductDepartmentNotFoundError";
import { ProductTaxRateNotFoundError } from "../../domain/errors/ProductTaxRateNotFoundError";

export class UpdateProductUseCase {
  constructor(
    private readonly repo: ProductRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly taxRateRepo?: TaxRateRepository
  ) {}

  async execute(id: string, req: UpdateProductRequest): Promise<ProductDto> {
    if (req.departmentId !== undefined) {
      const department = await this.departmentRepo.findById(req.departmentId);
      if (!department || !department.isActive) {
        throw new ProductDepartmentNotFoundError(req.departmentId);
      }
    }
    if (req.taxRateId && this.taxRateRepo) {
      const taxRate = await this.taxRateRepo.findById(req.taxRateId);
      if (!taxRate || !taxRate.isActive) throw new ProductTaxRateNotFoundError(req.taxRateId);
    }
    const updated = await this.repo.update(id, req);
    return toProductDto(updated);
  }
}
