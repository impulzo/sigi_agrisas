import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { taxRatesController } from "@/modules/tax-rates/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "tax_rates:read");
  if (guard) return guard;
  return taxRatesController.getById(req, params.id);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "tax_rates:write");
  if (guard) return guard;
  return taxRatesController.update(req, params.id);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "tax_rates:write");
  if (guard) return guard;
  return taxRatesController.deactivate(req, params.id);
}
