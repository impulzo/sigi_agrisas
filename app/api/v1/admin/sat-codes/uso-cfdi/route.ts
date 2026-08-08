import { NextRequest } from "next/server";
import { satCfdiUsesController } from "@/modules/sat-codes/infrastructure/di/container";

export async function GET(req: NextRequest) {
  return satCfdiUsesController.search(req);
}
