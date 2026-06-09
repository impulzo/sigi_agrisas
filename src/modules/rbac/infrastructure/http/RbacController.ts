import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ListRolesUseCase } from "@/modules/rbac/application/use-cases/ListRolesUseCase";
import { RolePermissionRepository } from "@/modules/rbac/application/ports/RolePermissionRepository";
import { GrantPermissionToRoleUseCase } from "@/modules/rbac/application/use-cases/GrantPermissionToRoleUseCase";
import { RevokePermissionFromRoleUseCase } from "@/modules/rbac/application/use-cases/RevokePermissionFromRoleUseCase";
import { ListPermissionsUseCase } from "@/modules/rbac/application/use-cases/ListPermissionsUseCase";
import { AssignRoleToUserUseCase } from "@/modules/rbac/application/use-cases/AssignRoleToUserUseCase";
import { RevokeRoleFromUserUseCase } from "@/modules/rbac/application/use-cases/RevokeRoleFromUserUseCase";
import { ListUserPermissionsUseCase } from "@/modules/rbac/application/use-cases/ListUserPermissionsUseCase";
import { CheckUserPermissionUseCase } from "@/modules/rbac/application/use-cases/CheckUserPermissionUseCase";
import { RoleMapper } from "@/modules/rbac/application/mappers/RoleMapper";
import { PermissionMapper } from "@/modules/rbac/application/mappers/PermissionMapper";
import { RoleNotFoundError } from "@/modules/rbac/domain/errors/RoleNotFoundError";
import { PermissionNotFoundError } from "@/modules/rbac/domain/errors/PermissionNotFoundError";
import { RoleAlreadyAssignedError } from "@/modules/rbac/domain/errors/RoleAlreadyAssignedError";
import { PermissionAlreadyGrantedError } from "@/modules/rbac/domain/errors/PermissionAlreadyGrantedError";

const assignRoleSchema = z.object({
  roleName: z.string().regex(/^[a-z][a-z0-9_]{1,31}$/),
});

const grantPermissionSchema = z.object({
  permissionKey: z.string().regex(/^[a-z][a-z0-9_]{0,31}:[a-z][a-z0-9_]{0,31}$/),
});

export class RbacController {
  constructor(
    private readonly listRolesUC: ListRolesUseCase,
    private readonly rolePermissionRepo: RolePermissionRepository,
    private readonly grantPermissionUC: GrantPermissionToRoleUseCase,
    private readonly revokePermissionUC: RevokePermissionFromRoleUseCase,
    private readonly listPermissionsUC: ListPermissionsUseCase,
    private readonly assignRoleUC: AssignRoleToUserUseCase,
    private readonly revokeRoleUC: RevokeRoleFromUserUseCase,
    private readonly listUserPermissionsUC: ListUserPermissionsUseCase,
    private readonly checkPermissionUC: CheckUserPermissionUseCase
  ) {}

  async listRoles(_req: NextRequest): Promise<NextResponse> {
    const roles = await this.listRolesUC.execute();
    return NextResponse.json({ roles: roles.map(RoleMapper.toPlain) });
  }

  async listRolePermissions(_req: NextRequest, roleId: string): Promise<NextResponse> {
    const permissions = await this.rolePermissionRepo.listByRole(roleId);
    return NextResponse.json({ permissions: permissions.map(PermissionMapper.toPlain) });
  }

  async grantPermissionToRole(req: NextRequest, roleId: string): Promise<NextResponse> {
    const body = await req.json().catch(() => ({}));
    const parsed = grantPermissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    try {
      await this.grantPermissionUC.execute(roleId, parsed.data.permissionKey);
      return NextResponse.json({ success: true }, { status: 201 });
    } catch (err) {
      return this.handleError(err);
    }
  }

  async revokePermissionFromRole(_req: NextRequest, roleId: string, permId: string): Promise<NextResponse> {
    try {
      await this.revokePermissionUC.execute(roleId, permId);
      return NextResponse.json({ success: true });
    } catch (err) {
      return this.handleError(err);
    }
  }

  async listPermissions(_req: NextRequest): Promise<NextResponse> {
    const permissions = await this.listPermissionsUC.execute();
    return NextResponse.json({ permissions: permissions.map(PermissionMapper.toPlain) });
  }

  async assignRoleToUser(req: NextRequest, userId: string): Promise<NextResponse> {
    const body = await req.json().catch(() => ({}));
    const parsed = assignRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    try {
      await this.assignRoleUC.execute(userId, parsed.data.roleName);
      return NextResponse.json({ success: true }, { status: 201 });
    } catch (err) {
      return this.handleError(err);
    }
  }

  async revokeRoleFromUser(_req: NextRequest, userId: string, roleId: string): Promise<NextResponse> {
    try {
      await this.revokeRoleUC.execute(userId, roleId);
      return NextResponse.json({ success: true });
    } catch (err) {
      return this.handleError(err);
    }
  }

  async listUserPermissions(_req: NextRequest, userId: string): Promise<NextResponse> {
    const permissions = await this.listUserPermissionsUC.execute(userId);
    return NextResponse.json({ permissions });
  }

  private handleError(err: unknown): NextResponse {
    if (err instanceof RoleNotFoundError || err instanceof PermissionNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof RoleAlreadyAssignedError || err instanceof PermissionAlreadyGrantedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
