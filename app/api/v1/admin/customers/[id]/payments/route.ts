import { NextRequest } from "next/server";
import { paymentsController } from "@/modules/payments/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return paymentsController.getAccountDebt(req, params.id);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return paymentsController.registerAccount(req, params.id);
}
