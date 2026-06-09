export interface RoleAssigner {
  assignDefaultRole(userId: string): Promise<void>;
}
