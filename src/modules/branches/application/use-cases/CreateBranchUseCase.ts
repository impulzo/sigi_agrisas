import { BranchRepository, CreateBranchData } from "@/modules/branches/application/ports/BranchRepository";
import { BranchDto, toBranchDto } from "@/modules/branches/application/dto/BranchDto";
export class CreateBranchUseCase {
  constructor(private readonly repo: BranchRepository) {}
  async execute(data: CreateBranchData): Promise<BranchDto> { return toBranchDto(await this.repo.create(data)); }
}
