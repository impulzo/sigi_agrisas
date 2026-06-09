import { DepartmentRepository } from "@/modules/departments/application/ports/DepartmentRepository";
import { DepartmentDto, toDepartmentDto } from "@/modules/departments/application/dto/DepartmentDto";
import { DepartmentNotFoundError } from "@/modules/departments/domain/errors/DepartmentNotFoundError";

export class GetDepartmentUseCase {
  constructor(private readonly repo: DepartmentRepository) {}
  async execute(id: string): Promise<DepartmentDto> {
    const d = await this.repo.findById(id);
    if (!d) throw new DepartmentNotFoundError();
    return toDepartmentDto(d);
  }
}
