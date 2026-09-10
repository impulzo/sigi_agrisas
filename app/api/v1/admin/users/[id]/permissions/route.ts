import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { rbacController } from "@/modules/rbac/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const selfId = req.headers.get("x-user-id");
  const isSelf = selfId === params.id;

  if (!isSelf) {
    const guard = await requirePermission(req, "users:read");
    if (guard) return guard;
  } else if (!selfId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return rbacController.listUserPermissions(req, params.id);
}
