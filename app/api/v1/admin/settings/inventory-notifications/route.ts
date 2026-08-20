import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { settingsController } from "@/modules/settings/infrastructure/di/container";

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, "settings:read");
  if (guard) return guard;
  return settingsController.getInventoryNotifications();
}

export async function PATCH(req: NextRequest) {
  const guard = await requirePermission(req, "settings:write");
  if (guard) return guard;
  return settingsController.updateInventoryNotifications(req);
}
