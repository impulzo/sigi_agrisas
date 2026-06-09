export interface UserDto {
  id: string;
  name?: string;
  email: string;
  avatarUrl: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersResponse {
  users: UserDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UpdateUserBody {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
}

export type UpdateUserResponse = UserDto;

export interface AssignRoleBody {
  roleName: string;
}
