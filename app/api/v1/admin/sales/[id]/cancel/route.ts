import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { salesController } from "@/modules/pos/infrastructure/di/container";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "sales:cancel");
  if (guard) return guard;
  return salesController.cancel(req, params.id);
}
