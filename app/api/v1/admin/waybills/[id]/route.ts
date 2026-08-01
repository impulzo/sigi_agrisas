import { NextRequest } from "next/server";
import { waybillsController } from "@/modules/waybills/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return waybillsController.getById(req, params.id);
}
