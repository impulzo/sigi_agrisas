import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { taxRatesController } from "@/modules/tax-rates/infrastructure/di/container";

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, "tax_rates:read");
  if (guard) return guard;
  return taxRatesController.list(req);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, "tax_rates:write");
  if (guard) return guard;
  return taxRatesController.create(req);
}
