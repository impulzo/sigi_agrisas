import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { settingsController } from "@/modules/settings/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "settings:read");
  if (guard) return guard;
  return settingsController.getPrinterConfig(req, params.id);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "settings:write");
  if (guard) return guard;
  return settingsController.updatePrinterConfig(req, params.id);
}
