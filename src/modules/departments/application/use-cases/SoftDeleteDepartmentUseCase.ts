import { DepartmentRepository } from "@/modules/departments/application/ports/DepartmentRepository";

export class SoftDeleteDepartmentUseCase {
  constructor(private readonly repo: DepartmentRepository) {}
  async execute(id: string): Promise<void> { await this.repo.softDelete(id); }
}
