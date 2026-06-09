import { ProductRepository } from "../ports/ProductRepository";
import { DepartmentRepository } from "@/modules/departments/application/ports/DepartmentRepository";
import { CreateProductRequest } from "../dto/CreateProductRequest";
import { ProductDto } from "../dto/ProductDto";
import { toProductDto } from "../mappers/toProductDto";
import { ProductDepartmentNotFoundError } from "../../domain/errors/ProductDepartmentNotFoundError";

export class CreateProductUseCase {
  constructor(
    private readonly repo: ProductRepository,
    private readonly departmentRepo: DepartmentRepository
  ) {}

  async execute(req: CreateProductRequest): Promise<ProductDto> {
    const department = await this.departmentRepo.findById(req.departmentId);
    if (!department || !department.isActive) {
      throw new ProductDepartmentNotFoundError(req.departmentId);
    }
    const created = await this.repo.create(req);
    return toProductDto(created);
  }
}
