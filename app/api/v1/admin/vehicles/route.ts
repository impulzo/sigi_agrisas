import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { vehiclesController } from "@/modules/vehicles/infrastructure/di/container";

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, "vehicles:read");
  if (guard) return guard;
  return vehiclesController.list(req);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, "vehicles:write");
  if (guard) return guard;
  return vehiclesController.create(req);
}
