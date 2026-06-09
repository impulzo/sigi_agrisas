import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { departmentsController } from "@/modules/departments/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "departments:read");
  if (guard) return guard;
  return departmentsController.getById(req, params.id);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "departments:write");
  if (guard) return guard;
  return departmentsController.update(req, params.id);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "departments:write");
  if (guard) return guard;
  return departmentsController.softDelete(req, params.id);
}
