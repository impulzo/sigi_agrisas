export interface PermissionListResponse {
  permissions: Array<{ id: string; key: string; description?: string }>;
}
