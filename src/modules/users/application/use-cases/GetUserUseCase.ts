import { AdminUserRepository } from "@/modules/users/application/ports/AdminUserRepository";
import { AdminUser } from "@/modules/users/domain/entities/AdminUser";
import { UserNotFoundError } from "@/modules/users/domain/errors/UserNotFoundError";

export class GetUserUseCase {
  constructor(private readonly repo: AdminUserRepository) {}

  async execute(id: string): Promise<AdminUser> {
    const user = await this.repo.findById(id);
    if (!user) throw new UserNotFoundError();
    return user;
  }
}
