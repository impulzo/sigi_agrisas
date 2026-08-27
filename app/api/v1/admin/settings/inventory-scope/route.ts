import { NextResponse } from "next/server";
import { getInventoryScopeMode } from "@/shared/infrastructure/config/inventoryScope";

/** Config de despliegue, no dato sensible — sólo requiere sesión autenticada (ya garantizado por el middleware global). */
export function GET() {
  return NextResponse.json({ mode: getInventoryScopeMode() });
}
