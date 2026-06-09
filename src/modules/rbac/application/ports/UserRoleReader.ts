export interface UserRoleReader {
  listRoleNamesByUser(userId: string): Promise<string[]>;
}
