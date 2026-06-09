import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { salesController } from "@/modules/pos/infrastructure/di/container";

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, "sales:read");
  if (guard) return guard;
  return salesController.list(req);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, "sales:create");
  if (guard) return guard;
  return salesController.create(req);
}
