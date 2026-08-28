import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { usersController } from "@/modules/users/infrastructure/di/container";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "users:write");
  if (guard) return guard;
  return usersController.resendSetPasswordEmail(req, params.id);
}
