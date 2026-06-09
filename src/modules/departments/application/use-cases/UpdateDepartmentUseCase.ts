import { DepartmentRepository, UpdateDepartmentData } from "@/modules/departments/application/ports/DepartmentRepository";
import { DepartmentDto, toDepartmentDto } from "@/modules/departments/application/dto/DepartmentDto";

export interface UpdateDepartmentRequest extends UpdateDepartmentData { id: string; }

export class UpdateDepartmentUseCase {
  constructor(private readonly repo: DepartmentRepository) {}
  async execute(req: UpdateDepartmentRequest): Promise<DepartmentDto> {
    const { id, ...data } = req;
    return toDepartmentDto(await this.repo.update(id, data));
  }
}
