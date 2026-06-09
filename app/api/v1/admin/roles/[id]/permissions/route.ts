import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { rbacController } from "@/modules/rbac/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "roles:read");
  if (guard) return guard;
  return rbacController.listRolePermissions(req, params.id);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "roles:write");
  if (guard) return guard;
  return rbacController.grantPermissionToRole(req, params.id);
}
