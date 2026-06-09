import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { customersController } from "@/modules/customers/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "customers:read");
  if (guard) return guard;
  return customersController.getById(req, params.id);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "customers:write");
  if (guard) return guard;
  return customersController.update(req, params.id);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "customers:write");
  if (guard) return guard;
  return customersController.softDelete(req, params.id);
}
