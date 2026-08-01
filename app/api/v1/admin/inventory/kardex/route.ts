import { NextRequest } from "next/server";
import { inventoryMovementsController } from "@/modules/inventory/infrastructure/di/container";

export async function GET(req: NextRequest) {
  return inventoryMovementsController.getKardex(req);
}
