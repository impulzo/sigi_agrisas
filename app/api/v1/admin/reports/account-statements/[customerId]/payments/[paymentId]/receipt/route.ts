import { NextRequest } from "next/server";
import { reportsController } from "@/modules/reports/infrastructure/di/container";

export async function GET(
  req: NextRequest,
  { params }: { params: { customerId: string; paymentId: string } }
) {
  return reportsController.getAnticipoReceipt(req, params.customerId, params.paymentId);
}
