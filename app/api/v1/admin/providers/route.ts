import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { providersController } from "@/modules/providers/infrastructure/di/container";

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, "providers:read");
  if (guard) return guard;
  return providersController.list(req);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, "providers:write");
  if (guard) return guard;
  return providersController.create(req);
}
