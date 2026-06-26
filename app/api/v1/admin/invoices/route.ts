import { NextRequest } from "next/server";
import { billingController } from "@/modules/billing/infrastructure/di/container";

export async function GET(req: NextRequest) {
  return billingController.list(req);
}

export async function POST(req: NextRequest) {
  return billingController.stamp(req);
}
