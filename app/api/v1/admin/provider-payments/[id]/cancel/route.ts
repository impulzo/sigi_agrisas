import { NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { purchasesController } from "@/modules/purchases/infrastructure/di/container";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "purchases:pay_cancel");
  if (guard) return guard;
  return purchasesController.cancelProviderPayment(req, params.id);
}
