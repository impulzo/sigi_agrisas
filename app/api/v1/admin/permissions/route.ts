import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { rbacController } from "@/modules/rbac/infrastructure/di/container";

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, "roles:read");
  if (guard) return guard;
  return rbacController.listPermissions(req);
}
