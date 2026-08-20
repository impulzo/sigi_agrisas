import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { driversController } from "@/modules/drivers/infrastructure/di/container";

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, "drivers:read");
  if (guard) return guard;
  return driversController.list(req);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, "drivers:write");
  if (guard) return guard;
  return driversController.create(req);
}
