import { DepartmentRepository, CreateDepartmentData } from "@/modules/departments/application/ports/DepartmentRepository";
import { DepartmentDto, toDepartmentDto } from "@/modules/departments/application/dto/DepartmentDto";

export class CreateDepartmentUseCase {
  constructor(private readonly repo: DepartmentRepository) {}
  async execute(data: CreateDepartmentData): Promise<DepartmentDto> {
    return toDepartmentDto(await this.repo.create(data));
  }
}
