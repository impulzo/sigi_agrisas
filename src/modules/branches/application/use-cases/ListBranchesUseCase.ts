import { BranchRepository } from "@/modules/branches/application/ports/BranchRepository";
import { BranchDto, toBranchDto } from "@/modules/branches/application/dto/BranchDto";
export interface ListBranchesRequest { page: number; pageSize: number; includeInactive: boolean; }
export interface ListBranchesResponse { items: BranchDto[]; total: number; page: number; pageSize: number; }
export class ListBranchesUseCase {
  constructor(private readonly repo: BranchRepository) {}
  async execute(req: ListBranchesRequest): Promise<ListBranchesResponse> {
    const { items, total } = await this.repo.findAll(req);
    return { items: items.map(toBranchDto), total, page: req.page, pageSize: req.pageSize };
  }
}
