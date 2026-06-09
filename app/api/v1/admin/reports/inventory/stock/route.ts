import { NextRequest } from "next/server";
import { reportsController } from "@/modules/reports/infrastructure/di/container";

export async function GET(req: NextRequest) {
  return reportsController.getInventoryStockReport(req);
}
