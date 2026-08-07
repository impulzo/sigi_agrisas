import { NextRequest } from "next/server";
import { satTaxRegimesController } from "@/modules/sat-codes/infrastructure/di/container";

export async function GET(req: NextRequest) {
  return satTaxRegimesController.search(req);
}
