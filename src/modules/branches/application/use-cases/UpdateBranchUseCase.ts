import { BranchRepository, UpdateBranchData } from "@/modules/branches/application/ports/BranchRepository";
import { BranchDto, toBranchDto } from "@/modules/branches/application/dto/BranchDto";
export interface UpdateBranchRequest extends UpdateBranchData { id: string; }
export class UpdateBranchUseCase {
  constructor(private readonly repo: BranchRepository) {}
  async execute(req: UpdateBranchRequest): Promise<BranchDto> {
    const { id, ...data } = req;
    return toBranchDto(await this.repo.update(id, data));
  }
}
