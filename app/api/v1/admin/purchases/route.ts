import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { purchasesController } from "@/modules/purchases/infrastructure/di/container";

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, "purchases:read");
  if (guard) return guard;
  return purchasesController.list(req);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, "purchases:create");
  if (guard) return guard;
  return purchasesController.create(req);
}
