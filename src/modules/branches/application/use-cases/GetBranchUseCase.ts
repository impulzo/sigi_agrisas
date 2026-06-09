import { BranchRepository } from "@/modules/branches/application/ports/BranchRepository";
import { BranchDto, toBranchDto } from "@/modules/branches/application/dto/BranchDto";
import { BranchNotFoundError } from "@/modules/branches/domain/errors/BranchNotFoundError";
export class GetBranchUseCase {
  constructor(private readonly repo: BranchRepository) {}
  async execute(id: string): Promise<BranchDto> {
    const b = await this.repo.findById(id);
    if (!b) throw new BranchNotFoundError();
    return toBranchDto(b);
  }
}
