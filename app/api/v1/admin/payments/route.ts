import { NextRequest } from "next/server";
import { paymentsController } from "@/modules/payments/infrastructure/di/container";

export async function GET(req: NextRequest) {
  return paymentsController.list(req);
}

export async function POST(req: NextRequest) {
  return paymentsController.register(req);
}
