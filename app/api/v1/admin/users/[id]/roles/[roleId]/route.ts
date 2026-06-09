import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { rbacController } from "@/modules/rbac/infrastructure/di/container";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; roleId: string } }
) {
  const guard = await requirePermission(req, "users:write");
  if (guard) return guard;
  return rbacController.revokeRoleFromUser(req, params.id, params.roleId);
}
