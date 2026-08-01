import { NextRequest } from "next/server";
import { waybillsController } from "@/modules/waybills/infrastructure/di/container";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return waybillsController.cancel(req, params.id);
}
