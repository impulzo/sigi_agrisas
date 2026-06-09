import { NextRequest } from "next/server";
import { paymentsController } from "@/modules/payments/infrastructure/di/container";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return paymentsController.cancel(req, params.id);
}
