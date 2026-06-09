import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { quotesController } from "@/modules/quotes/infrastructure/di/container";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "quotes:convert");
  if (guard) return guard;
  return quotesController.convert(req, params.id);
}
