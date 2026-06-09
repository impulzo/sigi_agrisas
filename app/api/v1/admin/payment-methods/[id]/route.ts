import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { paymentMethodsController } from "@/modules/payment-methods/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "payment_methods:read");
  if (guard) return guard;
  return paymentMethodsController.getById(req, params.id);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "payment_methods:write");
  if (guard) return guard;
  return paymentMethodsController.update(req, params.id);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "payment_methods:write");
  if (guard) return guard;
  return paymentMethodsController.softDelete(req, params.id);
}
