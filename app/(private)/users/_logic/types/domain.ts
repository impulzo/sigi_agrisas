export interface User {
  id: string;
  name?: string;
  email: string;
  avatarUrl: string;
  branchId: string | null;
  branchName: string | null;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}
