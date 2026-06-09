import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { foliosController } from "@/modules/folios/infrastructure/di/container";

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, "folios:read");
  if (guard) return guard;
  return foliosController.list(req);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, "folios:write");
  if (guard) return guard;
  return foliosController.create(req);
}
