import { NextRequest } from "next/server";
import { paymentsController } from "@/modules/payments/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return paymentsController.listBySale(req, params.id);
}
