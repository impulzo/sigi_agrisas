import { DepartmentRepository } from "@/modules/departments/application/ports/DepartmentRepository";
import { DepartmentDto, toDepartmentDto } from "@/modules/departments/application/dto/DepartmentDto";

export interface ListDepartmentsRequest { page: number; pageSize: number; includeInactive: boolean; providerId?: string; }
export interface ListDepartmentsResponse { items: DepartmentDto[]; total: number; page: number; pageSize: number; }

export class ListDepartmentsUseCase {
  constructor(private readonly repo: DepartmentRepository) {}
  async execute(req: ListDepartmentsRequest): Promise<ListDepartmentsResponse> {
    const { items, total } = await this.repo.findAll(req);
    return { items: items.map(toDepartmentDto), total, page: req.page, pageSize: req.pageSize };
  }
}
