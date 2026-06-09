import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { rbacController } from "@/modules/rbac/infrastructure/di/container";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; permId: string } }
) {
  const guard = await requirePermission(req, "roles:write");
  if (guard) return guard;
  return rbacController.revokePermissionFromRole(req, params.id, params.permId);
}
