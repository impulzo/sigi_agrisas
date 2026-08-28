import { AdminUserRepository } from "@/modules/users/application/ports/AdminUserRepository";
import { AdminUser } from "@/modules/users/domain/entities/AdminUser";
import { CreateUserRequest } from "@/modules/users/application/dto/CreateUserRequest";
import { BranchNotFoundForUserError } from "@/modules/users/domain/errors/BranchNotFoundForUserError";
import { BranchRepository } from "@/modules/branches/application/ports/BranchRepository";

export class CreateAdminUserUseCase {
  constructor(
    private readonly repo: AdminUserRepository,
    private readonly branchRepo: BranchRepository
  ) {}

  async execute(req: CreateUserRequest): Promise<AdminUser> {
    if (req.branchId) {
      const branch = await this.branchRepo.findById(req.branchId);
      if (!branch) throw new BranchNotFoundForUserError();
    }

    return this.repo.create({
      name: req.name,
      email: req.email,
      avatarUrl: req.avatarUrl,
      branchId: req.branchId,
      roleIds: req.roleIds,
    });
  }
}
