export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  avatarUrl?: string | null;
  branchId?: string | null;
  roleIds?: string[];
}
