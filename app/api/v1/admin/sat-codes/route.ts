import { NextRequest } from "next/server";
import { satCodesController } from "@/modules/sat-codes/infrastructure/di/container";

export async function GET(req: NextRequest) {
  return satCodesController.search(req);
}
