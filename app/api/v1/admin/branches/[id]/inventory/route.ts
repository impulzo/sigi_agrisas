import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { branchInventoryController } from "@/modules/inventory/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "inventory:read");
  if (guard) return guard;
  return branchInventoryController.list(req, params.id);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "inventory:write");
  if (guard) return guard;
  return branchInventoryController.create(req, params.id);
}
