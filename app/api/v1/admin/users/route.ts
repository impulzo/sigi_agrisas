import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { usersController } from "@/modules/users/infrastructure/di/container";

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, "users:read");
  if (guard) return guard;
  return usersController.listUsers(req);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, "users:write");
  if (guard) return guard;
  return usersController.createUser(req);
}
