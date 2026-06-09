import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { productsController } from "@/modules/products/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "products:read");
  if (guard) return guard;
  return productsController.getById(req, params.id);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "products:write");
  if (guard) return guard;
  return productsController.update(req, params.id);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "products:write");
  if (guard) return guard;
  return productsController.softDelete(req, params.id);
}
