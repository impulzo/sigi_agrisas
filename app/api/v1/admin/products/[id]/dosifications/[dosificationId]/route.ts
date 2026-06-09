import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { productDosificationsController } from "@/modules/products/infrastructure/di/container";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; dosificationId: string } }
) {
  const guard = await requirePermission(req, "products:write");
  if (guard) return guard;
  return productDosificationsController.update(req, params.id, params.dosificationId);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; dosificationId: string } }
) {
  const guard = await requirePermission(req, "products:write");
  if (guard) return guard;
  return productDosificationsController.delete(req, params.id, params.dosificationId);
}
