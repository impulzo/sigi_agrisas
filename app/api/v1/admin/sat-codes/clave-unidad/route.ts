import { NextRequest } from "next/server";
import { satUnitsController } from "@/modules/sat-codes/infrastructure/di/container";

export async function GET(req: NextRequest) {
  return satUnitsController.search(req);
}
