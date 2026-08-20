import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { vehiclesController } from "@/modules/vehicles/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "vehicles:read");
  if (guard) return guard;
  return vehiclesController.getById(req, params.id);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "vehicles:write");
  if (guard) return guard;
  return vehiclesController.update(req, params.id);
}
