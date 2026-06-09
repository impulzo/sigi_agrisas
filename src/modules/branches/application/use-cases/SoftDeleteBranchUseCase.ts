import { BranchRepository } from "@/modules/branches/application/ports/BranchRepository";
export class SoftDeleteBranchUseCase {
  constructor(private readonly repo: BranchRepository) {}
  async execute(id: string): Promise<void> { await this.repo.softDelete(id); }
}
