import { AdminUserRepository } from "@/modules/users/application/ports/AdminUserRepository";
import { AdminUser } from "@/modules/users/domain/entities/AdminUser";
import { UpdateUserRequest } from "@/modules/users/application/dto/UpdateUserRequest";
import { SelfModificationError } from "@/modules/users/domain/errors/SelfModificationError";
import { BranchNotFoundForUserError } from "@/modules/users/domain/errors/BranchNotFoundForUserError";
import { BranchRepository } from "@/modules/branches/application/ports/BranchRepository";

export class UpdateUserUseCase {
  constructor(
    private readonly repo: AdminUserRepository,
    private readonly branchRepo: BranchRepository
  ) {}

  async execute(req: UpdateUserRequest): Promise<AdminUser> {
    if (req.requesterId === req.id) throw new SelfModificationError("modify");
    const hasField =
      req.name !== undefined ||
      req.email !== undefined ||
      req.avatarUrl !== undefined ||
      req.branchId !== undefined;
    if (!hasField)
      throw new Error(
        "At least one field (name, email, avatarUrl, branchId) must be provided"
      );

    if (req.branchId) {
      const branch = await this.branchRepo.findById(req.branchId);
      if (!branch) throw new BranchNotFoundForUserError();
    }

    return this.repo.update(req.id, {
      name: req.name,
      email: req.email,
      avatarUrl: req.avatarUrl,
      branchId: req.branchId,
    });
  }
}
