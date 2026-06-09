export interface AuthorizationService {
  userCan(userId: string, key: string): Promise<boolean>;
  listUserPermissions(userId: string): Promise<string[]>;
  invalidate(userId: string): void;
  invalidateByRole(roleId: string): Promise<void>;
}
