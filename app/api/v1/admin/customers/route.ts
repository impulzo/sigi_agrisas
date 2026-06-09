import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { customersController } from "@/modules/customers/infrastructure/di/container";

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, "customers:read");
  if (guard) return guard;
  return customersController.list(req);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, "customers:write");
  if (guard) return guard;
  return customersController.create(req);
}
