export interface User {
  id: string;
  name?: string;
  email: string;
  avatarUrl: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}
