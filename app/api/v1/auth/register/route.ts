import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { authController } from "@/modules/auth/infrastructure/di/container";

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, "users:write");
  if (guard) return guard;
  return authController.register(req);
}
