import { NextRequest } from "next/server";
import { waybillsController } from "@/modules/waybills/infrastructure/di/container";

export async function GET(req: NextRequest) {
  return waybillsController.list(req);
}

export async function POST(req: NextRequest) {
  return waybillsController.create(req);
}
