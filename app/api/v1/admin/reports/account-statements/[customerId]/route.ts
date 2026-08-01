import { NextRequest } from "next/server";
import { reportsController } from "@/modules/reports/infrastructure/di/container";

export async function GET(req: NextRequest, { params }: { params: { customerId: string } }) {
  return reportsController.getAccountStatementLedger(req, params.customerId);
}
