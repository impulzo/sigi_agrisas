import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { settingsController } from "@/modules/settings/infrastructure/di/container";

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, "settings:write");
  if (guard) return guard;
  return settingsController.uploadLogo(req);
}

export async function DELETE(req: NextRequest) {
  const guard = await requirePermission(req, "settings:write");
  if (guard) return guard;
  return settingsController.deleteLogo();
}
