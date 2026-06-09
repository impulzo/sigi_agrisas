export interface UpdateUserRequest {
  id: string;
  requesterId: string;
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  branchId?: string | null;
}
