import { NextRequest } from "next/server";
import { billingController } from "@/modules/billing/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return billingController.getById(req, params.id);
}
