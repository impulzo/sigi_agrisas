import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { productsController } from "@/modules/products/infrastructure/di/container";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "products:write");
  if (guard) return guard;
  return productsController.uploadImage(req, params.id);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "products:write");
  if (guard) return guard;
  return productsController.deleteImage(req, params.id);
}
