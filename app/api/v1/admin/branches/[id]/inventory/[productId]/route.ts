import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { branchInventoryController } from "@/modules/inventory/infrastructure/di/container";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  const guard = await requirePermission(req, "inventory:read");
  if (guard) return guard;
  return branchInventoryController.getById(req, params.id, params.productId);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  const guard = await requirePermission(req, "inventory:write");
  if (guard) return guard;
  return branchInventoryController.update(req, params.id, params.productId);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  const guard = await requirePermission(req, "inventory:write");
  if (guard) return guard;
  return branchInventoryController.delete(req, params.id, params.productId);
}
