import { AdminUserRepository } from "@/modules/users/application/ports/AdminUserRepository";
import { SelfModificationError } from "@/modules/users/domain/errors/SelfModificationError";

export class DeleteUserUseCase {
  constructor(private readonly repo: AdminUserRepository) {}

  async execute(id: string, requesterId: string): Promise<void> {
    if (requesterId === id) throw new SelfModificationError("delete");
    await this.repo.delete(id);
  }
}
