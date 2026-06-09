import { AdminUserRepository } from "@/modules/users/application/ports/AdminUserRepository";
import { ListUsersRequest } from "@/modules/users/application/dto/ListUsersRequest";
import { ListUsersResponse } from "@/modules/users/application/dto/ListUsersResponse";

export class ListUsersUseCase {
  constructor(private readonly repo: AdminUserRepository) {}

  async execute(req: ListUsersRequest): Promise<ListUsersResponse> {
    const page = req.page < 1 ? 1 : req.page;
    const pageSize = req.pageSize > 100 ? (() => { throw new Error("pageSize must not exceed 100"); })() : req.pageSize;
    const { users, total } = await this.repo.findAll({ page, pageSize });
    return { users, total, page, pageSize };
  }
}
