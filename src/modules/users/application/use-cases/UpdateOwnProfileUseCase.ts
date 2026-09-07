import { AdminUserRepository } from "@/modules/users/application/ports/AdminUserRepository";
import { AdminUser } from "@/modules/users/domain/entities/AdminUser";

export interface UpdateOwnProfileRequest {
  id: string;
  name?: string;
  email?: string;
}

export class UpdateOwnProfileUseCase {
  constructor(private readonly repo: AdminUserRepository) {}

  async execute(req: UpdateOwnProfileRequest): Promise<AdminUser> {
    const hasField = req.name !== undefined || req.email !== undefined;
    if (!hasField) throw new Error("At least one field (name, email) must be provided");

    return this.repo.update(req.id, {
      name: req.name,
      email: req.email,
    });
  }
}
