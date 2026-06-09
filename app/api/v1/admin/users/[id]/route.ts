import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { usersController } from "@/modules/users/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "users:read");
  if (guard) return guard;
  return usersController.getUser(req, params.id);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "users:write");
  if (guard) return guard;
  return usersController.updateUser(req, params.id);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "users:write");
  if (guard) return guard;
  return usersController.deleteUser(req, params.id);
}
