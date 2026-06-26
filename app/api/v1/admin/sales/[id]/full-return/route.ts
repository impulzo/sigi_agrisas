import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { returnsController } from "@/modules/returns/infrastructure/di/container";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "returns:create");
  if (guard) return guard;
  return returnsController.fullReturn(req, params.id);
}
