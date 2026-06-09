import { NextRequest } from "next/server";
import { paymentsController } from "@/modules/payments/infrastructure/di/container";

export async function GET(req: NextRequest) {
  return paymentsController.history(req);
}
