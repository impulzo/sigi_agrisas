import { NextRequest } from "next/server";
import { billingController } from "@/modules/billing/infrastructure/di/container";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return billingController.cancel(req, params.id);
}
