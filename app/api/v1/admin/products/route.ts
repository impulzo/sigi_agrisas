import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { productsController } from "@/modules/products/infrastructure/di/container";

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, "products:read");
  if (guard) return guard;
  return productsController.list(req);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, "products:write");
  if (guard) return guard;
  return productsController.create(req);
}
