import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { productPricesController } from "@/modules/products/infrastructure/di/container";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; priceId: string } }
) {
  const guard = await requirePermission(req, "products:write");
  if (guard) return guard;
  return productPricesController.update(req, params.id, params.priceId);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; priceId: string } }
) {
  const guard = await requirePermission(req, "products:write");
  if (guard) return guard;
  return productPricesController.delete(req, params.id, params.priceId);
}
