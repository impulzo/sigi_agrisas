import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { foliosController } from "@/modules/folios/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "folios:read");
  if (guard) return guard;
  return foliosController.audit(req, params.id);
}
