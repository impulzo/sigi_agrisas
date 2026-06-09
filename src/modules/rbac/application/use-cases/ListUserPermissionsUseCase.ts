import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";

export class ListUserPermissionsUseCase {
  constructor(private readonly authzService: AuthorizationService) {}

  async execute(userId: string): Promise<string[]> {
    return this.authzService.listUserPermissions(userId);
  }
}
