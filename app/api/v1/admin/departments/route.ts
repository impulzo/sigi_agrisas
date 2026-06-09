import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { departmentsController } from "@/modules/departments/infrastructure/di/container";

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, "departments:read");
  if (guard) return guard;
  return departmentsController.list(req);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, "departments:write");
  if (guard) return guard;
  return departmentsController.create(req);
}
