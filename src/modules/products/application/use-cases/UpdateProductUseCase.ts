import { ProductRepository } from "../ports/ProductRepository";
import { DepartmentRepository } from "@/modules/departments/application/ports/DepartmentRepository";
import { UpdateProductRequest } from "../dto/UpdateProductRequest";
import { ProductDto } from "../dto/ProductDto";
import { toProductDto } from "../mappers/toProductDto";
import { ProductDepartmentNotFoundError } from "../../domain/errors/ProductDepartmentNotFoundError";

export class UpdateProductUseCase {
  constructor(
    private readonly repo: ProductRepository,
    private readonly departmentRepo: DepartmentRepository
  ) {}

  async execute(id: string, req: UpdateProductRequest): Promise<ProductDto> {
    if (req.departmentId !== undefined) {
      const department = await this.departmentRepo.findById(req.departmentId);
      if (!department || !department.isActive) {
        throw new ProductDepartmentNotFoundError(req.departmentId);
      }
    }
    const updated = await this.repo.update(id, req);
    return toProductDto(updated);
  }
}
