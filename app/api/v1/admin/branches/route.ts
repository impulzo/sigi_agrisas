import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { branchesController } from "@/modules/branches/infrastructure/di/container";

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, "branches:read");
  if (guard) return guard;
  return branchesController.list(req);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, "branches:write");
  if (guard) return guard;
  return branchesController.create(req);
}
