import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { rbacController } from "@/modules/rbac/infrastructure/di/container";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "users:write");
  if (guard) return guard;
  return rbacController.assignRoleToUser(req, params.id);
}
