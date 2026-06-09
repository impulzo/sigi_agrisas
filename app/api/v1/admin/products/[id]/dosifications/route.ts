import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { productDosificationsController } from "@/modules/products/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "products:read");
  if (guard) return guard;
  return productDosificationsController.list(req, params.id);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "products:write");
  if (guard) return guard;
  return productDosificationsController.create(req, params.id);
}
