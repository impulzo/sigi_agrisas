import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { branchInventoryController } from "@/modules/inventory/infrastructure/di/container";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  const guard = await requirePermission(req, "inventory:write");
  if (guard) return guard;
  return branchInventoryController.adjust(req, params.id, params.productId);
}
