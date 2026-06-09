import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";

export class CheckUserPermissionUseCase {
  constructor(private readonly authzService: AuthorizationService) {}

  async execute(userId: string, permissionKey: string): Promise<boolean> {
    return this.authzService.userCan(userId, permissionKey);
  }
}
