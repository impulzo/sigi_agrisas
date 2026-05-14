import { NextRequest } from "next/server";
import { authController } from "@/modules/auth/infrastructure/di/container";

export async function POST(req: NextRequest) {
  return authController.register(req);
}
