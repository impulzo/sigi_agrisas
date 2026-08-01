import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { purchasesController } from "@/modules/purchases/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "purchases:read");
  if (guard) return guard;
  return purchasesController.listProviderPaymentsByPurchase(req, params.id);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "purchases:pay");
  if (guard) return guard;
  return purchasesController.registerProviderPayment(req, params.id);
}
