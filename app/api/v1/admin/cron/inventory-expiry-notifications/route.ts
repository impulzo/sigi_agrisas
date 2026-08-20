import { NextRequest } from "next/server";
import { verifyCronSecret } from "@/shared/infrastructure/http/verifyCronSecret";
import { inventoryCronController } from "@/modules/inventory/infrastructure/di/container";

export async function POST(req: NextRequest) {
  const guard = verifyCronSecret(req);
  if (guard) return guard;
  return inventoryCronController.sendExpiryNotifications();
}
