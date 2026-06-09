import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { returnsController } from "@/modules/returns/infrastructure/di/container";

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, "returns:read");
  if (guard) return guard;
  return returnsController.list(req);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, "returns:create");
  if (guard) return guard;
  return returnsController.create(req);
}
