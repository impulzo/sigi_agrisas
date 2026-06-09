import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { branchesController } from "@/modules/branches/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "branches:read");
  if (guard) return guard;
  return branchesController.getById(req, params.id);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "branches:write");
  if (guard) return guard;
  return branchesController.update(req, params.id);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "branches:write");
  if (guard) return guard;
  return branchesController.softDelete(req, params.id);
}
