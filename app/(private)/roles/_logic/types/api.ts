export interface RoleDto {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionDto {
  id: string;
  key: string;
  description: string | null;
}

export interface ListRolesResponse {
  roles: RoleDto[];
}

export interface ListPermissionsResponse {
  permissions: PermissionDto[];
}

export interface ListRolePermissionsResponse {
  permissions: PermissionDto[];
}

export interface GrantPermissionPayload {
  permissionKey: string;
}
