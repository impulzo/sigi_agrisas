import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../_lib/authFetch";
import type { ListUsersResponse, UserDto } from "../types/api";
import type { User } from "../types/domain";

function toUser(dto: UserDto): User {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    avatarUrl: dto.avatarUrl,
    roles: dto.roles,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export { toUser };

export async function listUsers(
  { page, pageSize }: { page: number; pageSize: number },
  fetchImpl = authFetch
): Promise<{ users: User[]; total: number; page: number; pageSize: number }> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/users?page=${page}&pageSize=${pageSize}`);
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  const body = (await res.json()) as ListUsersResponse;
  return {
    users: body.users.map(toUser),
    total: body.total,
    page: body.page,
    pageSize: body.pageSize,
  };
}
