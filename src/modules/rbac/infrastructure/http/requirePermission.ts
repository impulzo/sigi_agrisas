import { NextRequest, NextResponse } from "next/server";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";
import { rbacContainer } from "@/modules/rbac/infrastructure/di/container";

export async function requirePermission(
  req: NextRequest,
  key: string,
  authzService: AuthorizationService = rbacContainer.authorizationService
): Promise<NextResponse | null> {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await authzService.userCan(userId, key);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden", required: key }, { status: 403 });
  }

  return null;
}
