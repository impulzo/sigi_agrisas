import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { paymentMethodsController } from "@/modules/payment-methods/infrastructure/di/container";

export async function GET(req: NextRequest) {
  const guard = await requirePermission(req, "payment_methods:read");
  if (guard) return guard;
  return paymentMethodsController.list(req);
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission(req, "payment_methods:write");
  if (guard) return guard;
  return paymentMethodsController.create(req);
}
