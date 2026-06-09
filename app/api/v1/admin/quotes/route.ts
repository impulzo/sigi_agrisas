import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { quotesController } from "@/modules/quotes/infrastructure/di/container";

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, "quotes:read");
  if (guard) return guard;
  return quotesController.list(req);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, "quotes:create");
  if (guard) return guard;
  return quotesController.create(req);
}
