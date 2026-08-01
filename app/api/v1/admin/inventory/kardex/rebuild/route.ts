import { NextRequest } from "next/server";
import { inventoryMovementsController } from "@/modules/inventory/infrastructure/di/container";

export async function POST(req: NextRequest) {
  return inventoryMovementsController.rebuild(req);
}
