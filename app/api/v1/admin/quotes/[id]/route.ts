import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { quotesController } from "@/modules/quotes/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "quotes:read");
  if (guard) return guard;
  return quotesController.getById(req, params.id);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "quotes:write");
  if (guard) return guard;
  return quotesController.update(req, params.id);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "quotes:cancel");
  if (guard) return guard;
  return quotesController.cancel(req, params.id);
}
